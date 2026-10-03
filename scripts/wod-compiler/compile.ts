/*
  WOD / exercise dataset compiler.

  Cleans and standardises two datasets, ties them together, and writes one
  master dataset plus the two files the runtimes read:

    wods.csv (Kaggle uihyunk/crossfit-wods-2019-2025)
      → cleaned prose → parsed by the conversion engine → one record per workout
    exercises.json (yuhonas/free-exercise-db)
      → cleaned → the exercise each lexicon movement maps to

    movements.json is the bridge: every CrossFit movement the engine can
    recognise, with the catalog exercise it corresponds to.
    glossary.json is the semantic lexicon: box shorthand and gym slang for
    formats, scores, structure, modifiers, loads and units.
    muscles.json names the muscles each movement works (catalog vocabulary)
    and how those names map onto the Muscle Visualizer API; the compiler
    tallies them into one muscle map per workout (`muscles`, `visual`), and
    visualize.ts turns the maps into pictures.

  Outputs (--out <dir>):
    wods-master.json       everything, for review and for both runtimes
    wods-app-export.json   content programs for the mobile app
    wods-site.json         workout pages for the website
    wods-review.md         what to look at: unrecognised text, low-confidence
                           rows, loads that could not be tied to a movement

  Usage:
    npx tsx compile.ts --wods ../../data/wods.csv --exercises ../../data/yuhonas-exercises.json \
      [--lexicon movements.json] [--glossary glossary.json] [--muscles muscles.json] [--images <dir>] \
      --out ../../content/wods --license-approved --reviewer "Chris Castorino" --reviewed-at 2026-10-03

    --images points at the folder visualize.ts wrote (its manifest.json ties
    muscle keys to picture files); when given, each workout's `visual.images`
    names its pictures.
*/
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseWodDetailed, type WodGlossary, type WodLexicon, type WodParsed } from '../../packages/fitness-applied-tools/src/wodConversionEngine.js';
import {
  generatePage,
  generateProgram,
  muscleKey,
  workoutIntro,
  workoutMuscles,
  type BenchmarkTable,
  type ScalingTable,
  type MasterDataset,
  type MasterExercise,
  type MasterMovement,
  type MasterWorkout,
  type MuscleSet,
  type WorkoutVisual,
} from '../../packages/fitness-applied-tools/src/workoutGenerator.js';

/* ---------- muscle table ---------- */

export type MuscleTable = {
  name: string;
  revision: string;
  note?: string;
  /** catalog muscle → visualizer names to try, in order */
  catalog: Record<string, string[]>;
  /** lexicon movement id → muscles, for movements with no catalog exercise */
  movements: Record<string, MuscleSet>;
};

/** visualize.ts writes this next to the pictures: muscle key → files (relative to the images folder). */
export type ImageManifest = {
  provider: 'exercisedb-muscle-visualizer';
  generatedAt: string;
  /** The colours the pictures were drawn with (visualize.ts COLORS). */
  colors?: { target: string; secondary: string };
  images: Record<string, { male?: string; female?: string; target: string[]; secondary: string[] }>;
};

export function validateMuscleTable(table: MuscleTable, lexicon: WodLexicon, catalogMuscles: Set<string>): string[] {
  const problems: string[] = [];
  for (const m of catalogMuscles) if (!table.catalog[m]) problems.push(`catalog muscle "${m}" has no visualizer names in muscles.json`);
  const ids = new Set(lexicon.movements.map((m) => m.id));
  for (const [id, set] of Object.entries(table.movements)) {
    if (!ids.has(id)) problems.push(`muscles.json names movement "${id}", which is not in the lexicon`);
    for (const x of [...set.target, ...set.secondary]) if (!table.catalog[x]) problems.push(`movement "${id}" uses muscle "${x}", which is not a catalog muscle`);
  }
  return problems;
}

/* ---------- CSV ---------- */

export function parseCsv(input: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const text = input.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  if (quoted) throw new Error('CSV import failed: an unterminated quoted field was found.');
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim()));
  if (!header) throw new Error('CSV import failed: the file is empty.');
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])) as Record<string, string>);
}

/* ---------- cleaning ---------- */

/** Straight quotes, one kind of dash, one space between words. The engine gets clean prose. */
export function cleanProse(text: string): string {
  return text
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (const ch of value) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/* ---------- exercise catalog ---------- */

type YuhonasRecord = {
  id: string;
  name: string;
  force?: string | null;
  level?: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
};

export const EXERCISE_SOURCE = {
  name: 'yuhonas/free-exercise-db',
  revision: 'f00c92c',
  license: 'Unlicense',
  licenseUrl: 'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE',
  attribution: 'Exercise names and instructions from free-exercise-db (yuhonas), public domain.',
};

export function cleanExercise(record: YuhonasRecord): MasterExercise {
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    id: record.id,
    name: cleanProse(record.name),
    instructions: (record.instructions ?? []).map(cleanProse).filter(Boolean),
    ...(text(record.category) ? { category: text(record.category) } : {}),
    ...(text(record.equipment) ? { equipment: text(record.equipment) } : {}),
    ...(text(record.level) ? { level: text(record.level) } : {}),
    ...(text(record.mechanic) ? { mechanic: text(record.mechanic) } : {}),
    ...(text(record.force) ? { force: text(record.force) } : {}),
    primaryMuscles: record.primaryMuscles ?? [],
    secondaryMuscles: record.secondaryMuscles ?? [],
    source: { name: EXERCISE_SOURCE.name, recordId: record.id, revision: EXERCISE_SOURCE.revision, license: EXERCISE_SOURCE.license, attribution: EXERCISE_SOURCE.attribution },
  };
}

/* ---------- the compile step ---------- */

export const WOD_SOURCE = {
  name: 'kaggle/uihyunk/crossfit-wods-2019-2025',
  revision: 'v1',
  license: 'Database: Open Database (ODbL), Contents: Database Contents',
  licenseUrl: 'https://opendatacommons.org/licenses/odbl/',
  attribution: 'Dataset by UiHyunK on Kaggle; content collected from CrossFit.com. Review redistribution terms before publication.',
};

export type CompileOptions = {
  wodsCsv: string;
  exercises: YuhonasRecord[];
  lexicon: WodLexicon;
  glossary?: WodGlossary;
  muscles?: MuscleTable;
  scaling?: ScalingTable;
  benchmarks?: BenchmarkTable;
  images?: ImageManifest;
  license: { approved: boolean; reviewer?: string; reviewedAt?: string };
  now?: string;
};

export type CompileResult = {
  master: MasterDataset;
  appExport: { schemaVersion: 'workout-program-export-v2'; source: typeof WOD_SOURCE & { review: CompileOptions['license'] }; programs: ReturnType<typeof generateProgram>[] };
  site: { schemaVersion: 'fitness-applied-wods-site-v1'; generatedAt: string; attribution: string; movements: MasterMovement[]; workouts: ReturnType<typeof generatePage>[] };
  review: string;
};

export function compile(options: CompileOptions): CompileResult {
  if (!options.license.approved) {
    throw new Error('Compile blocked: an explicit license review approval (--license-approved) is required before producing marketplace content.');
  }
  const now = options.now ?? new Date().toISOString();
  const { lexicon, glossary, muscles: muscleTable } = options;

  /* exercises: clean the catalog, keep the ones the lexicon points at */
  const catalog = new Map(options.exercises.map((e) => [e.id, cleanExercise(e)]));
  const catalogMuscles = new Set(options.exercises.flatMap((e) => [...(e.primaryMuscles ?? []), ...(e.secondaryMuscles ?? [])]));
  if (muscleTable) {
    const problems = validateMuscleTable(muscleTable, lexicon, catalogMuscles);
    if (problems.length) throw new Error(`muscles.json: ${problems.join('; ')}`);
  }
  const movements: MasterMovement[] = lexicon.movements.map((m) => {
    const exercise = m.catalog ? catalog.get(m.catalog) ?? null : null;
    if (m.catalog && !exercise) throw new Error(`Lexicon movement "${m.id}" points at catalog exercise "${m.catalog}", which is not in the exercise file.`);
    // Muscles: the table's own entry wins (it can correct a catalog exercise), then the catalog exercise, then nothing.
    const own = muscleTable?.movements[m.id];
    const muscles: MuscleSet = own ? { target: [...own.target], secondary: [...own.secondary] }
      : exercise ? { target: [...exercise.primaryMuscles], secondary: exercise.secondaryMuscles.filter((x) => !exercise.primaryMuscles.includes(x)) }
        : { target: [], secondary: [] };
    return { id: m.id, name: m.name, pattern: m.pattern, equipment: m.equipment, measure: m.measure, note: m.note ?? '', aliases: m.aliases, exercise, muscles };
  });
  const movementById = new Map(movements.map((m) => [m.id, m]));
  const noMuscles = movements.filter((m) => !m.muscles.target.length && !['rest', 'skills-practice'].includes(m.id)).map((m) => m.id);

  /* workouts: clean, dedupe, parse */
  const rows = parseCsv(options.wodsCsv);
  if (!rows.length || !('wod' in rows[0])) throw new Error('CSV import failed: the file must contain a wod column.');
  const seen = new Map<string, string>();
  const duplicates = new Map<string, string[]>();
  const dropped: MasterDataset['review']['dropped'] = [];
  const workouts: MasterWorkout[] = [];
  const unrecognised = new Map<string, { count: number; workouts: Set<string> }>();
  const slugs = new Set<string>();
  let unnamed = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const prescription = cleanProse(row.wod ?? '');
    if (!prescription) {
      dropped.push({ row: rowNumber, text: '', reason: 'empty wod column' });
      return;
    }
    const key = prescription.toLowerCase();
    const kept = seen.get(key);
    if (kept) {
      duplicates.set(kept, [...(duplicates.get(kept) ?? []), `row ${rowNumber}`]);
      return;
    }
    let parsed: WodParsed;
    try {
      parsed = parseWodDetailed(prescription, { lexicon, glossary, menSetting: cleanProse(row.men_setting ?? ''), womenSetting: cleanProse(row.women_setting ?? '') });
    } catch (error) {
      dropped.push({ row: rowNumber, text: prescription.slice(0, 120), reason: error instanceof Error ? error.message : 'parse failed' });
      return;
    }
    const movementLines = parsed.lines.filter((l) => l.kind === 'movement');
    if (!movementLines.length) {
      dropped.push({ row: rowNumber, text: prescription.slice(0, 120), reason: 'no movements found (not a workout?)' });
      return;
    }
    const givenName = cleanProse(row.name ?? row.title ?? row.workout_name ?? '');
    const named = !!(givenName || parsed.name);
    // The same named workout written twice ("Fight Gone Bad" / "Fight Gone Bad!", "rowing calories" / "rowing (calories)") is one workout.
    const sameKey = named ? `${(givenName || parsed.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${movementLines.map((l) => l.movementId ?? l.name.toLowerCase()).join(',')}|${parsed.format}` : null;
    const sameAs = sameKey ? seen.get(`same:${sameKey}`) : undefined;
    if (sameAs) {
      duplicates.set(sameAs, [...(duplicates.get(sameAs) ?? []), `row ${rowNumber} (same workout, different wording)`]);
      return;
    }
    const id = stableId('wod', `${WOD_SOURCE.name}:${WOD_SOURCE.revision}:${prescription}`);
    seen.set(key, id);
    if (sameKey) seen.set(`same:${sameKey}`, id);
    const name = givenName || parsed.name || `WOD ${String(++unnamed).padStart(4, '0')}`;
    let slug = slugify(name) || id;
    if (slugs.has(slug)) slug = `${slug}-${id.slice(-6)}`;
    slugs.add(slug);
    const equipment = [...new Set(movementLines.flatMap((l) => (l.movementId ? movementById.get(l.movementId)?.equipment ?? [] : [])))].sort();
    const patterns = [...new Set(movementLines.flatMap((l) => (l.movementId ? [movementById.get(l.movementId)?.pattern ?? ''] : [])))].filter(Boolean).sort();
    const muscles = workoutMuscles(parsed.lines, movementById);
    const visualKey = muscleKey(muscles);
    const pictures = options.images?.images[visualKey];
    const visual: WorkoutVisual | undefined = muscles.target.length
      ? { provider: 'exercisedb-muscle-visualizer', key: visualKey, target: muscles.target, secondary: muscles.secondary, ...(pictures?.male || pictures?.female ? { images: { ...(pictures.male ? { male: pictures.male } : {}), ...(pictures.female ? { female: pictures.female } : {}) }, ...(options.images?.colors ? { colors: options.images.colors } : {}) } : {}) }
      : undefined;
    for (const l of parsed.lines) {
      if (!l.recognised && l.kind !== 'rest') {
        const t = l.name.toLowerCase();
        const entry = unrecognised.get(t) ?? { count: 0, workouts: new Set<string>() };
        entry.count += 1;
        entry.workouts.add(id);
        unrecognised.set(t, entry);
      }
    }
    const record: Omit<MasterWorkout, 'intro'> = {
      id,
      slug,
      name,
      named,
      ...(row.date ? { date: row.date } : {}),
      format: parsed.format,
      score: parsed.score,
      timer: parsed.timer,
      trackingInputs: parsed.trackingInputs,
      ...(parsed.timeCapSeconds ? { timeCapSeconds: parsed.timeCapSeconds } : {}),
      ...(parsed.rounds ? { rounds: parsed.rounds } : {}),
      ...(parsed.repScheme ? { repScheme: parsed.repScheme } : {}),
      ...(parsed.sets ? { sets: parsed.sets } : {}),
      ...(parsed.intervalSeconds ? { intervalSeconds: parsed.intervalSeconds } : {}),
      ...(parsed.intervalCount ? { intervalCount: parsed.intervalCount } : {}),
      loads: parsed.loads,
      lines: parsed.lines,
      equipment,
      patterns,
      tags: parsed.tags,
      muscles,
      ...(visual ? { visual } : {}),
      prescription,
      warnings: parsed.warnings,
      confidence: parsed.confidence,
      source: { name: WOD_SOURCE.name, recordId: String(rowNumber - 1), revision: WOD_SOURCE.revision },
    };
    workouts.push({ ...record, intro: workoutIntro(record, movementById, { scaling: options.scaling, benchmarks: options.benchmarks }) });
  });

  const master: MasterDataset = {
    schemaVersion: 'fitness-applied-wod-master-v1',
    generatedAt: now,
    sources: {
      wods: { ...WOD_SOURCE, count: workouts.length },
      exercises: { ...EXERCISE_SOURCE, count: catalog.size },
      lexicon: { name: 'fitness-applied/wod-movement-lexicon', revision: 'v1', count: movements.length },
      ...(glossary ? { glossary: { name: 'fitness-applied/wod-glossary', revision: String((glossary as { schemaVersion?: string }).schemaVersion ?? 'v1'), count: (['format', 'score', 'structure', 'modifier', 'load', 'unit', 'equipment', 'slang', 'name'] as const).reduce((n, k) => n + (glossary[k]?.length ?? 0), 0) } } : {}),
      ...(muscleTable ? { muscles: { name: muscleTable.name, revision: muscleTable.revision, count: Object.keys(muscleTable.catalog).length } } : {}),
    },
    movements,
    workouts,
    review: {
      unrecognised: [...unrecognised.entries()]
        .map(([text, v]) => ({ text, count: v.count, workouts: [...v.workouts].slice(0, 5) }))
        .sort((a, b) => b.count - a.count),
      lowConfidence: workouts.filter((w) => w.confidence === 'low').map((w) => w.id),
      untiedLoads: workouts.filter((w) => w.warnings.some((x) => x.startsWith('A load was given'))).map((w) => w.id),
      duplicates: [...duplicates.entries()].map(([kept, droppedRows]) => ({ kept, dropped: droppedRows })),
      dropped,
      noMuscles,
      muscleSets: new Set(workouts.filter((w) => w.visual).map((w) => w.visual!.key)).size,
      pictured: workouts.filter((w) => w.visual?.images).length,
    },
  };

  const programs = workouts.map((w) => generateProgram(w, master, WOD_SOURCE.attribution));
  const pages = workouts.map((w) => generatePage(w, master));

  return {
    master,
    appExport: { schemaVersion: 'workout-program-export-v2', source: { ...WOD_SOURCE, review: options.license }, programs },
    site: { schemaVersion: 'fitness-applied-wods-site-v1', generatedAt: now, attribution: WOD_SOURCE.attribution, movements, workouts: pages },
    review: reviewMarkdown(master),
  };
}

/* ---------- review report ---------- */

function reviewMarkdown(master: MasterDataset): string {
  const byId = new Map(master.workouts.map((w) => [w.id, w]));
  const counts = (key: keyof MasterWorkout) => {
    const c = new Map<string, number>();
    for (const w of master.workouts) c.set(String(w[key]), (c.get(String(w[key])) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(', ');
  };
  const recognised = master.workouts.flatMap((w) => w.lines.filter((l) => l.kind === 'movement'));
  const hit = recognised.filter((l) => l.recognised).length;
  const mapped = master.movements.filter((m) => m.exercise).length;
  const lines = [
    `# WOD compile review`,
    ``,
    `Generated ${master.generatedAt}.`,
    ``,
    `- Workouts: ${master.workouts.length} (named: ${master.workouts.filter((w) => w.named).length})`,
    `- Dropped rows: ${master.review.dropped.length}; duplicate rows: ${master.review.duplicates.reduce((n, d) => n + d.dropped.length, 0)}`,
    `- Formats: ${counts('format')}`,
    `- Confidence: ${counts('confidence')}`,
    `- Movement lines recognised: ${hit} of ${recognised.length} (${Math.round((hit / Math.max(1, recognised.length)) * 100)}%)`,
    `- Lexicon movements: ${master.movements.length}, mapped to a catalog exercise: ${mapped}`,
    `- Tags: ${tagCounts(master)}`,
    `- Muscle maps: ${master.review.muscleSets} distinct muscle sets over ${master.workouts.filter((w) => w.visual).length} workouts; ${master.review.pictured} workouts have pictures`,
    ``,
    `## Unrecognised text (add to the lexicon, or leave as a note)`,
    ``,
    ...master.review.unrecognised.slice(0, 80).map((u) => `- ${u.count} × "${u.text}" (e.g. ${u.workouts.map((id) => byId.get(id)?.slug ?? id).slice(0, 3).join(', ')})`),
    ``,
    `## Low confidence (${master.review.lowConfidence.length})`,
    ``,
    ...master.review.lowConfidence.slice(0, 60).map((id) => {
      const w = byId.get(id)!;
      return `- **${w.slug}** · ${w.format} · ${w.prescription.slice(0, 140)}${w.prescription.length > 140 ? '…' : ''}`;
    }),
    ``,
    `## Loads that could not be tied to a movement (${master.review.untiedLoads.length})`,
    ``,
    ...master.review.untiedLoads.slice(0, 60).map((id) => {
      const w = byId.get(id)!;
      return `- **${w.slug}** · ${[w.loads.men, w.loads.women].filter(Boolean).join(' / ')} · ${w.prescription.slice(0, 120)}`;
    }),
    ``,
    `## Dropped rows (${master.review.dropped.length})`,
    ``,
    ...master.review.dropped.map((d) => `- row ${d.row}: ${d.reason}${d.text ? ` · ${d.text}` : ''}`),
    ``,
    `## Movements without a catalog exercise (${master.movements.length - mapped})`,
    ``,
    ...master.movements.filter((m) => !m.exercise).map((m) => `- ${m.id}: ${m.note}`),
    ``,
    `## Movements without muscles (${master.review.noMuscles.length}) — add them to muscles.json`,
    ``,
    ...master.review.noMuscles.map((id) => `- ${id}`),
    ``,
  ];
  return lines.join('\n');
}

function tagCounts(master: MasterDataset): string {
  const c = new Map<string, number>();
  for (const w of master.workouts) for (const t of w.tags) c.set(t, (c.get(t) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';
}

/* ---------- CLI ---------- */

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const value = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const wodsPath = value('--wods');
  const exercisesPath = value('--exercises');
  const here = (name: string) => new URL(`./${name}`, import.meta.url).pathname;
  const lexiconPath = value('--lexicon') ?? here('movements.json');
  const glossaryPath = value('--glossary') ?? here('glossary.json');
  const musclesPath = value('--muscles') ?? here('muscles.json');
  const scalingPath = value('--scaling') ?? here('scaling.json');
  const benchmarksPath = value('--benchmarks') ?? here('benchmarks.json');
  const imagesDir = value('--images');
  const outDir = value('--out') ?? 'out';
  if (!wodsPath || !exercisesPath) throw new Error('Usage: compile.ts --wods <wods.csv> --exercises <exercises.json> [--lexicon movements.json] [--glossary glossary.json] [--muscles muscles.json] [--images <dir>] --out <dir> --license-approved --reviewer <name> --reviewed-at <date>');

  const readJson = async <T,>(path: string): Promise<T> => JSON.parse(await readFile(resolve(path), 'utf8')) as T;
  const manifest = imagesDir ? await readJson<ImageManifest>(resolve(imagesDir, 'manifest.json')).catch(() => undefined) : undefined;
  const result = compile({
    wodsCsv: await readFile(resolve(wodsPath), 'utf8'),
    exercises: await readJson<YuhonasRecord[]>(exercisesPath),
    lexicon: await readJson<WodLexicon>(lexiconPath),
    glossary: await readJson<WodGlossary>(glossaryPath),
    muscles: await readJson<MuscleTable>(musclesPath),
    scaling: await readJson<ScalingTable>(scalingPath),
    benchmarks: await readJson<BenchmarkTable>(benchmarksPath),
    ...(manifest ? { images: manifest } : {}),
    license: { approved: args.includes('--license-approved'), reviewer: value('--reviewer'), reviewedAt: value('--reviewed-at') },
  });

  await mkdir(resolve(outDir), { recursive: true });
  const write = (name: string, data: unknown) => writeFile(resolve(outDir, name), typeof data === 'string' ? data : `${JSON.stringify(data)}\n`, 'utf8');
  await write('wods-master.json', result.master);
  await write('wods-app-export.json', result.appExport);
  await write('wods-site.json', result.site);
  await write('wods-review.md', result.review);
  const m = result.master;
  console.log(`Compiled ${m.workouts.length} workouts, ${m.movements.length} movements (${m.movements.filter((x) => x.exercise).length} with catalog exercises) → ${resolve(outDir)}`);
  console.log(`Confidence: ${m.workouts.filter((w) => w.confidence === 'high').length} high, ${m.workouts.filter((w) => w.confidence === 'medium').length} medium, ${m.workouts.filter((w) => w.confidence === 'low').length} low. Dropped ${m.review.dropped.length}.`);
  console.log(`Muscle maps: ${m.review.muscleSets} distinct sets; ${m.review.pictured} workouts with pictures${imagesDir ? '' : ' (run visualize.ts, then compile again with --images)'}.`);
}

if (process.argv[1]?.endsWith('compile.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Compile failed.');
    process.exitCode = 1;
  });
}
