import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseWod, type WodColumnarRecord } from '../../packages/fitness-applied-tools/src/wodConversionEngine.js';

export type WorkoutSourceLicense = {
  name: string;
  url?: string;
  approved: boolean;
  reviewer?: string;
  reviewedAt?: string;
  attribution: string;
};

export type WorkoutExportExercise = {
  id: string;
  exerciseId?: string;
  name: string;
  prescription: string;
  description?: string;
  instructions?: string;
  workoutType: 'standard' | 'amrap' | 'timed_sets';
  workoutFormat: 'standard' | 'amrap' | 'for_time' | 'emom' | 'timed_sets';
  timer?: {
    mode: 'none' | 'countdown' | 'stopwatch' | 'interval';
    durationSeconds?: number;
    intervalSeconds?: number;
  };
  tracking: {
    inputs: Array<'weight' | 'reps' | 'seconds' | 'rounds' | 'distance'>;
    effort?: 'rpe' | 'rir';
  };
  rounds?: number;
  sets?: number;
  reps?: number;
  timeCapSeconds?: number;
  intervalSeconds?: number;
  workDurationSeconds?: number;
  restSeconds?: number;
  movements: string[];
  conversionWarnings: string[];
};

export type WorkoutExportProgram = {
  id: string;
  name: string;
  /** Source date (YYYY-MM-DD) when the CSV carries one. */
  date?: string;
  type: 'crossfit_wod';
  category: 'WOD';
  description: string;
  phase: 'Imported workout';
  sections: Array<{
    id: string;
    title: string;
    summary: string;
    exercises: WorkoutExportExercise[];
  }>;
  marketplace: {
    status: 'published';
    accessTier: 'free';
    adPolicy: 'none';
  };
  source: {
    name: string;
    recordId: string;
    revision: string;
    attribution: string;
  };
};

export type WorkoutExport = {
  schemaVersion: 'workout-program-export-v1';
  source: {
    name: string;
    revision: string;
    license: WorkoutSourceLicense;
  };
  programs: WorkoutExportProgram[];
};

export type ExerciseCatalogRecord = {
  exerciseId: string;
  name: string;
  aliases?: string[];
  instructions?: string;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error('CSV import failed: an unterminated quoted field was found.');
  values.push(value.trim());
  return values;
}

function parseCsv(input: string): Array<Record<string, string>> {
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error('CSV import failed: the file is empty.');
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  if (!headers.includes('wod')) throw new Error('CSV import failed: the file must contain a wod column.');
  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as Record<string, string>;
  });
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `kaggle-crossfit-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function timerFor(columns: WodColumnarRecord): WorkoutExportExercise['timer'] {
  if (columns.workoutType === 'amrap' || columns.workoutType === 'for_time') {
    return { mode: 'countdown', ...(columns.timeCapSeconds === undefined ? {} : { durationSeconds: columns.timeCapSeconds }) };
  }
  if (columns.workoutType === 'emom' || columns.workoutType === 'timed_sets') {
    return {
      mode: columns.intervalSeconds === undefined ? 'countdown' : 'interval',
      ...(columns.timeCapSeconds === undefined ? {} : { durationSeconds: columns.timeCapSeconds }),
      ...(columns.intervalSeconds === undefined ? {} : { intervalSeconds: columns.intervalSeconds }),
    };
  }
  return { mode: 'none' };
}

function resolveCatalogExercise(wod: string, catalog: ExerciseCatalogRecord[]): ExerciseCatalogRecord | undefined {
  const normalized = wod.toLowerCase();
  return catalog
    .filter((exercise) => [exercise.name, ...(exercise.aliases ?? [])]
      .some((term) => term.trim().length >= 4 && normalized.includes(term.toLowerCase())))
    .sort((left, right) => right.name.length - left.name.length)[0];
}

export function exportWorkoutPrograms(
  csv: string,
  source: { name: string; revision: string; license: WorkoutSourceLicense },
  exerciseCatalog: ExerciseCatalogRecord[] = [],
): WorkoutExport {
  if (!source.license.approved) {
    throw new Error('Export blocked: an explicit license review approval is required before creating marketplace content.');
  }
  const rows = parseCsv(csv);
  const programs = rows.map((row, index) => {
    const wod = row.wod.trim();
    if (!wod) throw new Error(`CSV import failed: row ${index + 2} has an empty wod value.`);
    const id = stableId(`${source.name}:${source.revision}:${index + 1}:${wod}`);
    const columns = parseWod(wod);
    const catalogExercise = resolveCatalogExercise(wod, exerciseCatalog);
    // A `name` column (or `title`/`workout_name`) names the workout; without one
    // the row number is the only handle, which is what the site cards would show.
    const givenName = (row.name ?? row.title ?? row.workout_name ?? '').trim();
    const name = givenName || `CrossFit WOD ${index + 1}`;
    const date = (row.date ?? '').trim();
    const settings = [
      row.men_setting ? `Men's setting: ${row.men_setting}` : '',
      row.women_setting ? `Women's setting: ${row.women_setting}` : '',
    ].filter(Boolean).join('\n');
    return {
      id,
      name,
      ...(date ? { date } : {}),
      type: 'crossfit_wod' as const,
      category: 'WOD' as const,
      description: settings ? `${wod}\n\n${settings}` : wod,
      phase: 'Imported workout' as const,
      sections: [{
        id: `${id}-section-1`,
        title: 'Workout',
        summary: settings,
        exercises: [{
          id: `${id}-wod`,
          ...(catalogExercise ? { exerciseId: catalogExercise.exerciseId } : {}),
          name: catalogExercise?.name ?? 'CrossFit WOD',
          prescription: wod,
          ...(settings ? { description: settings } : {}),
          ...(catalogExercise?.instructions ? { instructions: catalogExercise.instructions } : {}),
          workoutType: columns.workoutType === 'for_time' ? 'standard' : columns.workoutType === 'emom' ? 'timed_sets' : columns.workoutType,
          workoutFormat: columns.workoutType,
          timer: timerFor(columns),
          tracking: { inputs: columns.trackingInputs, effort: 'rpe' },
          ...(columns.rounds === undefined ? {} : { rounds: columns.rounds }),
          ...(columns.sets === undefined ? {} : { sets: columns.sets }),
          ...(columns.reps === undefined ? {} : { repetitions: columns.reps }),
          ...(columns.timeCapSeconds === undefined ? {} : { timeCapSeconds: columns.timeCapSeconds }),
          ...(columns.intervalSeconds === undefined ? {} : { intervalSeconds: columns.intervalSeconds }),
          ...(columns.workDurationSeconds === undefined ? {} : { workDurationSeconds: columns.workDurationSeconds }),
          ...(columns.restSeconds === undefined ? {} : { restSeconds: columns.restSeconds }),
          movements: columns.movements,
          conversionWarnings: columns.warnings,
        }],
      }],
      marketplace: { status: 'published' as const, accessTier: 'free' as const, adPolicy: 'none' as const },
      source: { name: source.name, recordId: String(index + 1), revision: source.revision, attribution: source.license.attribution },
    };
  });
  return { schemaVersion: 'workout-program-export-v1', source, programs };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const inputPath = value('--input');
  const catalogPath = value('--catalog');
  const outputPath = value('--output') ?? 'crossfit-wods-program-export.json';
  if (!inputPath) throw new Error('Export failed: --input <wods.csv> is required.');
  const catalog = catalogPath
    ? (JSON.parse(await readFile(resolve(catalogPath), 'utf8')).exercises as ExerciseCatalogRecord[])
    : [];
  const result = exportWorkoutPrograms(await readFile(resolve(inputPath), 'utf8'), {
    name: 'kaggle/uihyunk/crossfit-wods-2019-2025',
    revision: value('--source-revision') ?? 'v1',
    license: {
      name: 'Database: Open Database, Contents: Database Contents',
      url: 'https://opendatacommons.org/licenses/odbl/',
      approved: args.includes('--license-approved'),
      reviewer: value('--reviewer'),
      reviewedAt: value('--reviewed-at'),
      attribution: 'Dataset by UiHyunK on Kaggle; content collected from CrossFit.com. Review redistribution terms before publication.',
    },
  }, catalog);
  await writeFile(resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Exported ${result.programs.length} draft programs to ${resolve(outputPath)}`);
}

if (process.argv[1]?.endsWith('export.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Export failed: unknown error.');
    process.exitCode = 1;
  });
}
