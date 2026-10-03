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

  Outputs (--out <dir>):
    wods-master.json       everything, for review and for both runtimes
    wods-app-export.json   content programs for the mobile app
    wods-site.json         workout pages for the website
    wods-review.md         what to look at: unrecognised text, low-confidence
                           rows, loads that could not be tied to a movement

  Usage:
    npx tsx compile.ts --wods ../../data/wods.csv --exercises ../../data/yuhonas-exercises.json \
      --out ../../content/wods --license-approved --reviewer "Chris Castorino" --reviewed-at 2026-10-03
*/
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseWodDetailed, type WodLexicon, type WodParsed } from '../../packages/fitness-applied-tools/src/wodConversionEngine.js';
import {
  generatePage,
  generateProgram,
  type MasterDataset,
  type MasterExercise,
  type MasterMovement,
  type MasterWorkout,
} from '../../packages/fitness-applied-tools/src/workoutGenerator.js';

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
  const lexicon = options.lexicon;

  /* exercises: clean the catalog, keep the ones the lexicon points at */
  const catalog = new Map(options.exercises.map((e) => [e.id, cleanExercise(e)]));
  const movements: MasterMovement[] = lexicon.movements.map((m) => {
    const exercise = m.catalog ? catalog.get(m.catalog) ?? null : null;
    if (m.catalog && !exercise) throw new Error(`Lexicon movement "${m.id}" points at catalog exercise "${m.catalog}", which is not in the exercise file.`);
    return { id: m.id, name: m.name, pattern: m.pattern, equipment: m.equipment, measure: m.measure, note: m.note ?? '', aliases: m.aliases, exercise };
  });
  const movementById = new Map(movements.map((m) => [m.id, m]));

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
      parsed = parseWodDetailed(prescription, { lexicon, menSetting: cleanProse(row.men_setting ?? ''), womenSetting: cleanProse(row.women_setting ?? '') });
    } catch (error) {
      dropped.push({ row: rowNumber, text: prescription.slice(0, 120), reason: error instanceof Error ? error.message : 'parse failed' });
      return;
    }
    const movementLines = parsed.lines.filter((l) => l.kind === 'movement');
    if (!movementLines.length) {
      dropped.push({ row: rowNumber, text: prescription.slice(0, 120), reason: 'no movements found (not a workout?)' });
      return;
    }
    const id = stableId('wod', `${WOD_SOURCE.name}:${WOD_SOURCE.revision}:${prescription}`);
    seen.set(key, id);
    const givenName = cleanProse(row.name ?? row.title ?? row.workout_name ?? '');
    const named = !!(givenName || parsed.name);
    const name = givenName || parsed.name || `WOD ${String(++unnamed).padStart(4, '0')}`;
    let slug = slugify(name) || id;
    if (slugs.has(slug)) slug = `${slug}-${id.slice(-6)}`;
    slugs.add(slug);
    const equipment = [...new Set(movementLines.flatMap((l) => (l.movementId ? movementById.get(l.movementId)?.equipment ?? [] : [])))].sort();
    const patterns = [...new Set(movementLines.flatMap((l) => (l.movementId ? [movementById.get(l.movementId)?.pattern ?? ''] : [])))].filter(Boolean).sort();
    for (const l of parsed.lines) {
      if (!l.recognised && l.kind !== 'rest') {
        const t = l.name.toLowerCase();
        const entry = unrecognised.get(t) ?? { count: 0, workouts: new Set<string>() };
        entry.count += 1;
        entry.workouts.add(id);
        unrecognised.set(t, entry);
      }
    }
    workouts.push({
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
      prescription,
      warnings: parsed.warnings,
      confidence: parsed.confidence,
      source: { name: WOD_SOURCE.name, recordId: String(rowNumber - 1), revision: WOD_SOURCE.revision },
    });
  });

  const master: MasterDataset = {
    schemaVersion: 'fitness-applied-wod-master-v1',
    generatedAt: now,
    sources: {
      wods: { ...WOD_SOURCE, count: workouts.length },
      exercises: { ...EXERCISE_SOURCE, count: catalog.size },
      lexicon: { name: 'fitness-applied/wod-movement-lexicon', revision: 'v1', count: movements.length },
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
  ];
  return lines.join('\n');
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
  const lexiconPath = value('--lexicon') ?? new URL('./movements.json', import.meta.url).pathname;
  const outDir = value('--out') ?? 'out';
  if (!wodsPath || !exercisesPath) throw new Error('Usage: compile.ts --wods <wods.csv> --exercises <exercises.json> [--lexicon movements.json] --out <dir> --license-approved --reviewer <name> --reviewed-at <date>');

  const result = compile({
    wodsCsv: await readFile(resolve(wodsPath), 'utf8'),
    exercises: JSON.parse(await readFile(resolve(exercisesPath), 'utf8')) as YuhonasRecord[],
    lexicon: JSON.parse(await readFile(resolve(lexiconPath), 'utf8')) as WodLexicon,
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
}

if (process.argv[1]?.endsWith('compile.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Compile failed.');
    process.exitCode = 1;
  });
}
