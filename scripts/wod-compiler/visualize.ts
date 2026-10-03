/*
  Muscle-map pictures for the master dataset.

  Reads wods-master.json, collects the distinct muscle sets the compiler put on
  each workout (`visual.key`, `visual.target`, `visual.secondary`) and asks the
  Muscle Visualizer API (github.com/ExerciseDB/muscle-visualizer-api, served
  through RapidAPI) for one "workout activation" picture per set and body
  model. Pictures are written to --out and listed in manifest.json; the next
  compile run with --images <that dir> puts the file names on each workout's
  `visual.images`, which the app and the website render.

  The key never enters the dataset. It is read from the environment:
    MUSCLE_VISUALIZER_API_KEY   your RapidAPI key (or RAPIDAPI_KEY)

  Usage:
    npx tsx visualize.ts --master ../../content/wods/wods-master.json --out ../../content/wods/images \
      [--gender male,female] [--size medium] [--format webp] [--limit 50] [--dry-run]

  Rules the script follows:
    - one picture per (muscle set, body model); workouts sharing a muscle set share the file
    - pictures already on disk are never fetched again (the run is resumable)
    - stops at the first 429 (quota) and says how many are left; run it again later
    - --dry-run lists the requests it would make, so you can see the count before spending quota
    - validates muscles.json against GET /api/v1/muscles and reports names the API does not know
*/
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { MasterDataset } from '../../packages/fitness-applied-tools/src/workoutGenerator.js';
import type { ImageManifest, MuscleTable } from './compile.js';

export const API_HOST = 'muscle-visualizer-api.p.rapidapi.com';
export const API_BASE = `https://${API_HOST}`;

/** Fitness Applied brand: gold for the target muscles, a light slate for the secondary ones (readable on navy and on white), no background so the picture sits on either theme. */
export const COLORS = { target: '#C9A86A', secondary: '#8DA2B9', background: 'transparent' };

export type VisualizeOptions = {
  gender: Array<'male' | 'female'>;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  format: 'png' | 'jpeg' | 'webp';
  limit?: number;
  dryRun: boolean;
};

export type Fetcher = (url: string, init: { headers: Record<string, string> }) => Promise<{ status: number; ok: boolean; arrayBuffer(): Promise<ArrayBuffer>; json(): Promise<unknown>; text(): Promise<string> }>;

/** Catalog names → the visualizer's names, using the first candidate the API knows. */
export function resolveMuscleNames(table: MuscleTable, known: string[]): { map: Record<string, string>; unknown: string[] } {
  const set = new Set(known.map((k) => k.toUpperCase()));
  const map: Record<string, string> = {};
  const unknown: string[] = [];
  for (const [catalogName, candidates] of Object.entries(table.catalog)) {
    const hit = candidates.find((c) => set.has(c.toUpperCase()));
    if (hit) map[catalogName] = hit.toUpperCase();
    else unknown.push(catalogName);
  }
  return { map, unknown };
}

/** The request for one picture: `/api/v1/visualize/workout?…` */
export function workoutImageUrl(target: string[], secondary: string[], gender: 'male' | 'female', options: Pick<VisualizeOptions, 'size' | 'format'>): string {
  const q = new URLSearchParams({
    targetMuscles: target.join(','),
    targetMusclesColor: COLORS.target,
    secondaryMuscles: secondary.join(','),
    secondaryMusclesColor: COLORS.secondary,
    gender,
    background: COLORS.background,
    size: options.size,
    format: options.format,
  });
  return `${API_BASE}/api/v1/visualize/workout?${q.toString()}`;
}

/** Every picture the dataset needs, deduplicated by muscle key and body model. */
export function plannedImages(master: MasterDataset, map: Record<string, string>, options: VisualizeOptions): Array<{ key: string; gender: 'male' | 'female'; file: string; target: string[]; secondary: string[]; apiTarget: string[]; apiSecondary: string[] }> {
  const sets = new Map<string, { target: string[]; secondary: string[] }>();
  for (const w of master.workouts) if (w.visual && !sets.has(w.visual.key)) sets.set(w.visual.key, { target: w.visual.target, secondary: w.visual.secondary });
  const out: ReturnType<typeof plannedImages> = [];
  for (const [key, set] of [...sets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const apiTarget = [...new Set(set.target.map((m) => map[m]).filter(Boolean))];
    const apiSecondary = [...new Set(set.secondary.map((m) => map[m]).filter(Boolean))].filter((m) => !apiTarget.includes(m));
    if (!apiTarget.length) continue;
    for (const gender of options.gender) out.push({ key, gender, file: `${key}-${gender}.${options.format}`, target: set.target, secondary: set.secondary, apiTarget, apiSecondary });
  }
  return out;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function visualize(master: MasterDataset, table: MuscleTable, outDir: string, options: VisualizeOptions, apiKey: string | undefined, fetcher: Fetcher = fetch as unknown as Fetcher): Promise<{ fetched: number; skipped: number; remaining: number; unknown: string[]; manifest: ImageManifest }> {
  await mkdir(outDir, { recursive: true });
  const manifestPath = resolve(outDir, 'manifest.json');
  const manifest: ImageManifest = (await exists(manifestPath))
    ? (JSON.parse(await readFile(manifestPath, 'utf8')) as ImageManifest)
    : { provider: 'exercisedb-muscle-visualizer', generatedAt: new Date().toISOString(), colors: { target: COLORS.target, secondary: COLORS.secondary }, images: {} };
  manifest.colors = { target: COLORS.target, secondary: COLORS.secondary };
  const headers = { 'X-RapidAPI-Key': apiKey ?? '', 'X-RapidAPI-Host': API_HOST };

  // Muscle names the API knows. Without a key (dry run) the first candidate of each catalog muscle is assumed.
  let known: string[] = Object.values(table.catalog).map((c) => c[0]);
  if (apiKey && !options.dryRun) {
    const res = await fetcher(`${API_BASE}/api/v1/muscles`, { headers });
    if (res.status === 429) throw new Error('The API returned 429 (quota or rate limit) on the muscle list. Try again later.');
    if (!res.ok) throw new Error(`GET /api/v1/muscles failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { data?: string[] } | string[];
    known = Array.isArray(body) ? body : body.data ?? [];
    if (!known.length) throw new Error('GET /api/v1/muscles returned no muscles.');
  }
  const { map, unknown } = resolveMuscleNames(table, known);

  const planned = plannedImages(master, map, options);
  let fetched = 0;
  let skipped = 0;
  let stoppedAt = -1;
  for (let i = 0; i < planned.length; i += 1) {
    const p = planned[i];
    const target = resolve(outDir, p.file);
    const entry = manifest.images[p.key] ?? { target: p.target, secondary: p.secondary };
    if (await exists(target)) {
      entry[p.gender] = p.file;
      manifest.images[p.key] = entry;
      skipped += 1;
      continue;
    }
    if (options.limit !== undefined && fetched >= options.limit) { stoppedAt = i; break; }
    const url = workoutImageUrl(p.apiTarget, p.apiSecondary, p.gender, options);
    if (options.dryRun) {
      console.log(`would fetch ${p.file}  ←  ${url.replace(API_BASE, '')}`);
      continue;
    }
    if (!apiKey) throw new Error('Set MUSCLE_VISUALIZER_API_KEY (your RapidAPI key) in the environment, or use --dry-run.');
    const res = await fetcher(url, { headers });
    if (res.status === 429) { stoppedAt = i; console.error(`Quota or rate limit reached (429) after ${fetched} pictures; ${planned.length - i} still to fetch. Run again later — finished pictures are kept.`); break; }
    if (!res.ok) throw new Error(`${p.file}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    entry[p.gender] = p.file;
    manifest.images[p.key] = entry;
    fetched += 1;
    manifest.generatedAt = new Date().toISOString();
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  if (!options.dryRun) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const remaining = stoppedAt >= 0 ? planned.length - stoppedAt : options.dryRun ? planned.length - skipped : 0;
  return { fetched, skipped, remaining, unknown, manifest };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const value = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const masterPath = value('--master');
  const outDir = value('--out');
  if (!masterPath || !outDir) throw new Error('Usage: visualize.ts --master wods-master.json --out <images dir> [--muscles muscles.json] [--gender male,female] [--size medium] [--format webp] [--limit N] [--dry-run]');
  const musclesPath = value('--muscles') ?? new URL('./muscles.json', import.meta.url).pathname;
  const options: VisualizeOptions = {
    gender: (value('--gender') ?? 'male,female').split(',').map((g) => g.trim()).filter((g): g is 'male' | 'female' => g === 'male' || g === 'female'),
    size: (value('--size') as VisualizeOptions['size']) ?? 'medium',
    format: (value('--format') as VisualizeOptions['format']) ?? 'webp',
    ...(value('--limit') ? { limit: Number(value('--limit')) } : {}),
    dryRun: args.includes('--dry-run'),
  };
  const master = JSON.parse(await readFile(resolve(masterPath), 'utf8')) as MasterDataset;
  const table = JSON.parse(await readFile(resolve(musclesPath), 'utf8')) as MuscleTable;
  const apiKey = process.env.MUSCLE_VISUALIZER_API_KEY ?? process.env.RAPIDAPI_KEY;
  const result = await visualize(master, table, resolve(outDir), options, apiKey);
  if (result.unknown.length) console.warn(`The API does not know a name for: ${result.unknown.join(', ')}. Add candidates to muscles.json → catalog.`);
  console.log(`${options.dryRun ? 'Planned' : 'Fetched'} ${options.dryRun ? result.remaining : result.fetched} pictures, ${result.skipped} already on disk, ${options.dryRun ? 0 : result.remaining} remaining → ${resolve(outDir)}`);
  if (!options.dryRun) console.log(`Now run compile.ts again with --images ${resolve(outDir)} so the workouts point at their pictures.`);
}

if (process.argv[1]?.endsWith('visualize.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Visualize failed.');
    process.exitCode = 1;
  });
}
