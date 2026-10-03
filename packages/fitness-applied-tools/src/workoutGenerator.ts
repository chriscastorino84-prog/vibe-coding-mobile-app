/*
  Workout generator.

  Reads the master dataset (scripts/wod-compiler → content/wods/wods-master.json)
  and produces what each runtime needs, from the same columns:

    generateProgram(workout, master)  → the app's content program shape
                                        (one exercise per movement line, with
                                        the timer, tracking inputs and
                                        catalog instructions attached)
    generatePage(workout, master)     → the website's workout page shape
                                        (the same tools, plus display text)

  The two are built from one record so the app and the site never disagree
  about a workout. Nothing here re-parses prose: the engine did that once at
  compile time and the generator only arranges columns.
*/
import type { WodFormat, WodLine, WodLoad, WodMeasure, WodQuantity, WodScore, WodTimerMode, WodTrackingInput } from './wodConversionEngine.js';

/* ---------- the master dataset ---------- */

export type MasterExercise = {
  id: string;
  name: string;
  instructions: string[];
  category?: string;
  equipment?: string;
  level?: string;
  mechanic?: string;
  force?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  source: { name: string; recordId: string; revision: string; license: string; attribution: string };
};

/** Muscles in the catalog's vocabulary (free-exercise-db names: "quadriceps", "lower back", …). */
export type MuscleSet = { target: string[]; secondary: string[] };

/**
 * The muscle map for a workout, ready for the Muscle Visualizer API
 * (github.com/ExerciseDB/muscle-visualizer-api). `key` identifies the muscle
 * set so workouts that work the same muscles share one image; `images` is
 * filled in by scripts/wod-compiler/visualize.ts once the pictures exist.
 */
export type WorkoutVisual = {
  provider: 'exercisedb-muscle-visualizer';
  key: string;
  target: string[];
  secondary: string[];
  images?: { male?: string; female?: string };
  /** The colours baked into the pictures, for the legend next to them. */
  colors?: { target: string; secondary: string };
};

export type MasterMovement = {
  id: string;
  name: string;
  pattern: string;
  equipment: string[];
  measure: WodMeasure;
  note: string;
  aliases: string[];
  exercise: MasterExercise | null;
  muscles: MuscleSet;
};

export type MasterWorkout = {
  id: string;
  slug: string;
  name: string;
  named: boolean;
  date?: string;
  format: WodFormat;
  score: WodScore;
  timer: { mode: WodTimerMode; durationSeconds?: number; intervalSeconds?: number; workSeconds?: number; restSeconds?: number; rounds?: number };
  trackingInputs: WodTrackingInput[];
  timeCapSeconds?: number;
  rounds?: number;
  repScheme?: number[];
  sets?: number;
  intervalSeconds?: number;
  intervalCount?: number;
  loads: WodLoad;
  lines: WodLine[];
  equipment: string[];
  patterns: string[];
  /** Semantic tags from the glossary: partner, ladder, rx, buy-in, cash-out. */
  tags: string[];
  muscles: MuscleSet;
  visual?: WorkoutVisual;
  prescription: string;
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
  source: { name: string; recordId: string; revision: string };
};

export type MasterDataset = {
  schemaVersion: 'fitness-applied-wod-master-v1';
  generatedAt: string;
  sources: Record<string, { name: string; revision: string; license?: string; licenseUrl?: string; attribution?: string; count: number }>;
  movements: MasterMovement[];
  workouts: MasterWorkout[];
  review: {
    unrecognised: Array<{ text: string; count: number; workouts: string[] }>;
    lowConfidence: string[];
    untiedLoads: string[];
    duplicates: Array<{ kept: string; dropped: string[] }>;
    dropped: Array<{ row: number; text: string; reason: string }>;
    /** Lexicon movements with no muscles yet (add them to muscles.json). */
    noMuscles: string[];
    /** Distinct muscle sets across the workouts: the number of pictures the visualizer needs. */
    muscleSets: number;
    /** Workouts whose visual already has pictures. */
    pictured: number;
  };
};

export function movementIndex(master: MasterDataset): Map<string, MasterMovement> {
  return new Map(master.movements.map((m) => [m.id, m]));
}

/* ---------- display helpers (shared by both outputs) ---------- */

const FORMAT_LABEL: Record<WodFormat, string> = {
  for_time: 'For time',
  amrap: 'AMRAP',
  emom: 'EMOM',
  death_by: 'Death by',
  tabata: 'Tabata',
  interval: 'Intervals',
  strength: 'Strength',
  max_load: 'Max load',
  skill: 'Skill',
  unknown: 'Workout',
};

const SCORE_LABEL: Record<WodScore, string> = {
  time: 'Your time',
  rounds_reps: 'Rounds + reps',
  reps: 'Total reps',
  load: 'Heaviest load',
  distance: 'Total distance',
  none: 'Done',
};

export function formatLabel(format: WodFormat): string {
  return FORMAT_LABEL[format];
}
export function scoreLabel(score: WodScore): string {
  return SCORE_LABEL[score];
}

export function secondsText(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (!m) return `${s} sec`;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

/** "30 reps", "400 m", "15/20 cal", "1 mile", "2 min" */
export function quantityText(q: WodQuantity | undefined): string {
  if (!q) return '';
  const value = q.alt !== undefined ? `${q.value}/${q.alt}` : String(q.value);
  switch (q.measure) {
    case 'reps':
      return `${value} rep${q.value === 1 && q.alt === undefined ? '' : 's'}`;
    case 'calories':
      return `${value} cal`;
    case 'seconds':
      return q.unit === 'min' ? `${q.value / 60} min` : secondsText(q.value);
    case 'distance': {
      const unit = q.unit === 'mile' ? (q.value === 1 ? 'mile' : 'miles') : q.unit ?? 'm';
      return `${value} ${unit}`;
    }
    case 'load':
      return value;
  }
}

/** One line of the workout the way a reader should see it: "30 deadlifts (205/145 lb)". */
export function lineText(line: WodLine, roundReps?: number[]): string {
  if (line.kind === 'rest') return line.quantity ? `Rest ${secondsText(line.quantity.value)}` : 'Rest';
  if (line.kind === 'note') return line.name;
  const qty = line.quantity ? quantityText(line.quantity) : line.repScheme ? `${line.repScheme.join('-')} reps` : roundReps ? `${roundReps.join('-')} reps` : '';
  const load = line.load ? ` (${[line.load.men, line.load.women].filter(Boolean).join(' / ')})` : '';
  const mods = line.modifiers.length ? `, ${line.modifiers.join(', ')}` : '';
  return `${qty ? `${qty} ` : ''}${line.name}${mods}${load}`.trim();
}

/** The headline of a workout: "3 rounds for time", "AMRAP 15 min", "EMOM 12 × 1 min". */
export function headline(w: MasterWorkout): string {
  switch (w.format) {
    case 'for_time':
      if (w.repScheme) return `${w.repScheme.join('-')} reps for time`;
      return w.rounds ? `${w.rounds} rounds for time` : 'For time';
    case 'amrap':
      return w.timeCapSeconds ? `AMRAP ${secondsText(w.timeCapSeconds)}` : 'AMRAP';
    case 'emom':
      return `EMOM${w.intervalCount ? ` ${w.intervalCount} ×` : ''} ${secondsText(w.intervalSeconds ?? 60)}`;
    case 'death_by':
      return `Death by · add a rep every ${secondsText(w.intervalSeconds ?? 60)}`;
    case 'max_load':
      return w.intervalSeconds ? `Every ${secondsText(w.intervalSeconds)}${w.intervalCount ? ` × ${w.intervalCount}` : ''}, for max load` : 'For max load';
    case 'tabata':
      return 'Tabata · 8 × (20 sec on / 10 sec off)';
    case 'interval':
      return w.timeCapSeconds ? `${secondsText(w.timeCapSeconds)} clock${w.rounds ? ` × ${w.rounds} rounds` : ''}` : 'Intervals';
    case 'strength':
      return w.repScheme ? `${w.repScheme.join('-')} reps` : w.sets ? `${w.sets} sets` : 'Strength';
    case 'skill':
      return 'Skill work';
    default:
      return 'Workout';
  }
}

/* ---------- app output: content program shape ---------- */

export type GeneratedExercise = {
  id: string;
  exerciseId?: string;
  name: string;
  prescription: string;
  description?: string;
  instructions?: string;
  workoutType: 'standard' | 'amrap' | 'timed_sets';
  workoutFormat: WodFormat;
  timer: { mode: WodTimerMode; durationSeconds?: number; intervalSeconds?: number; workDurationSeconds?: number; restSeconds?: number; rounds?: number };
  tracking: { inputs: WodTrackingInput[]; effort?: 'rpe' | 'rir'; measure: WodMeasure; score: WodScore };
  order: number;
  kind: 'movement' | 'rest' | 'note';
  role?: string;
  movementId?: string;
  pattern?: string;
  equipment?: string[];
  muscles?: MuscleSet;
  rounds?: number;
  sets?: number;
  repetitions?: number;
  /** Reps as the app shows them: "30", "21-15-9", or a distance/calorie text. */
  reps?: string;
  repScheme?: number[];
  quantity?: WodQuantity;
  load?: WodLoad;
  modifiers: string[];
  timeCapSeconds?: number;
  intervalSeconds?: number;
  workDurationSeconds?: number;
  restSeconds?: number;
  movements: string[];
  conversionWarnings: string[];
};

export type GeneratedProgram = {
  id: string;
  name: string;
  slug: string;
  date?: string;
  type: 'crossfit_wod';
  category: 'WOD';
  description: string;
  phase: 'Imported workout';
  headline: string;
  format: WodFormat;
  score: WodScore;
  scoreLabel: string;
  timer: GeneratedExercise['timer'];
  tracking: { inputs: WodTrackingInput[]; effort: 'rpe' };
  equipment: string[];
  patterns: string[];
  rounds?: number;
  repScheme?: number[];
  timeCapSeconds?: number;
  intervalSeconds?: number;
  intervalCount?: number;
  loads: WodLoad;
  tags: string[];
  muscles: MuscleSet;
  visual?: WorkoutVisual;
  sections: Array<{ id: string; title: string; summary: string; rounds?: string; exercises: GeneratedExercise[] }>;
  marketplace: { status: 'published'; accessTier: 'free'; adPolicy: 'none' };
  source: { name: string; recordId: string; revision: string; attribution: string };
  confidence: MasterWorkout['confidence'];
  conversionWarnings: string[];
};

function legacyWorkoutType(format: WodFormat): GeneratedExercise['workoutType'] {
  if (format === 'amrap') return 'amrap';
  if (format === 'emom' || format === 'death_by' || format === 'tabata' || format === 'interval' || format === 'max_load') return 'timed_sets';
  return 'standard';
}

function timerFor(w: MasterWorkout): GeneratedExercise['timer'] {
  const t = w.timer;
  return {
    mode: t.mode,
    ...(t.durationSeconds ? { durationSeconds: t.durationSeconds } : {}),
    ...(t.intervalSeconds ? { intervalSeconds: t.intervalSeconds } : {}),
    ...(t.workSeconds ? { workDurationSeconds: t.workSeconds } : {}),
    ...(t.restSeconds ? { restSeconds: t.restSeconds } : {}),
    ...(t.rounds ? { rounds: t.rounds } : {}),
  };
}

function loadLine(load: WodLoad): string {
  return [load.men ? `Men: ${load.men}` : '', load.women ? `Women: ${load.women}` : ''].filter(Boolean).join(' · ');
}

export function generateProgram(w: MasterWorkout, master: MasterDataset, attribution: string): GeneratedProgram {
  const movements = movementIndex(master);
  const timer = timerFor(w);
  // What the current app runtime reads to run its clock: AMRAP = one countdown, intervals = work/rest.
  const runtimeWork = w.format === 'amrap' || w.format === 'interval' || w.format === 'skill' ? w.timeCapSeconds
    : w.format === 'tabata' ? w.timer.workSeconds
      : w.format === 'emom' || w.format === 'death_by' || w.format === 'max_load' ? w.intervalSeconds
        : undefined;
  const exercises: GeneratedExercise[] = w.lines.map((line) => {
    const movement = line.movementId ? movements.get(line.movementId) : undefined;
    const exercise = movement?.exercise ?? null;
    const instructions = exercise?.instructions.length ? exercise.instructions.join(' ') : movement?.note;
    const reps = line.quantity?.measure === 'reps' && line.quantity.alt === undefined ? line.quantity.value : undefined;
    const repsText = line.repScheme ? line.repScheme.join('-') : reps !== undefined ? String(reps) : w.format === 'for_time' && w.repScheme && !line.quantity ? w.repScheme.join('-') : line.quantity ? quantityText(line.quantity) : undefined;
    return {
      id: `${w.id}-line-${line.order}`,
      ...(exercise ? { exerciseId: exercise.id } : {}),
      name: line.name,
      prescription: lineText(line, w.format === 'for_time' ? w.repScheme : undefined),
      ...(line.load ? { description: loadLine(line.load) } : {}),
      ...(instructions ? { instructions } : {}),
      workoutType: legacyWorkoutType(w.format),
      workoutFormat: w.format,
      timer,
      tracking: { inputs: w.trackingInputs, effort: 'rpe', measure: line.quantity?.measure ?? movement?.measure ?? 'reps', score: w.score },
      order: line.order,
      kind: line.kind,
      ...(line.role ? { role: line.role } : {}),
      ...(line.movementId ? { movementId: line.movementId } : {}),
      ...(movement ? { pattern: movement.pattern, equipment: movement.equipment, muscles: movement.muscles } : {}),
      ...(w.rounds ? { rounds: w.rounds } : {}),
      ...(line.repScheme ? { sets: line.repScheme.length, repScheme: line.repScheme } : w.format === 'strength' && w.sets ? { sets: w.sets } : {}),
      ...(reps !== undefined ? { repetitions: reps } : {}),
      ...(repsText ? { reps: repsText } : {}),
      ...(line.quantity ? { quantity: line.quantity } : {}),
      ...(line.load ? { load: line.load } : {}),
      modifiers: line.modifiers,
      ...(w.timeCapSeconds ? { timeCapSeconds: w.timeCapSeconds } : {}),
      ...(w.intervalSeconds ? { intervalSeconds: w.intervalSeconds } : {}),
      ...(runtimeWork ? { workDurationSeconds: runtimeWork } : {}),
      ...(line.kind === 'rest' && line.quantity ? { restSeconds: line.quantity.value } : w.timer.restSeconds ? { restSeconds: w.timer.restSeconds } : {}),
      movements: [line.raw],
      conversionWarnings: [],
    };
  });
  const settings = loadLine(w.loads);
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    ...(w.date ? { date: w.date } : {}),
    type: 'crossfit_wod',
    category: 'WOD',
    description: settings ? `${w.prescription}\n\n${settings}` : w.prescription,
    phase: 'Imported workout',
    headline: headline(w),
    format: w.format,
    score: w.score,
    scoreLabel: scoreLabel(w.score),
    timer,
    tracking: { inputs: w.trackingInputs, effort: 'rpe' },
    equipment: w.equipment,
    patterns: w.patterns,
    ...(w.rounds ? { rounds: w.rounds } : {}),
    ...(w.repScheme ? { repScheme: w.repScheme } : {}),
    ...(w.timeCapSeconds ? { timeCapSeconds: w.timeCapSeconds } : {}),
    ...(w.intervalSeconds ? { intervalSeconds: w.intervalSeconds } : {}),
    ...(w.intervalCount ? { intervalCount: w.intervalCount } : {}),
    loads: w.loads,
    tags: w.tags,
    muscles: w.muscles,
    ...(w.visual ? { visual: w.visual } : {}),
    sections: [{ id: `${w.id}-section-1`, title: headline(w), summary: settings, ...(w.rounds ? { rounds: String(w.rounds) } : {}), exercises }],
    marketplace: { status: 'published', accessTier: 'free', adPolicy: 'none' },
    source: { ...w.source, attribution },
    confidence: w.confidence,
    conversionWarnings: w.warnings,
  };
}

/* ---------- site output: workout page shape ---------- */

export type PageLine = {
  order: number;
  kind: 'movement' | 'rest' | 'note';
  text: string;
  name: string;
  movementId?: string;
  quantity?: WodQuantity;
  quantityText: string;
  repScheme?: number[];
  load?: WodLoad;
  modifiers: string[];
  measure: WodMeasure;
  role?: string;
  pattern?: string;
  equipment: string[];
  muscles?: MuscleSet;
  cue?: string;
};

export type WorkoutPage = {
  id: string;
  slug: string;
  name: string;
  named: boolean;
  date?: string;
  headline: string;
  format: WodFormat;
  formatLabel: string;
  score: WodScore;
  scoreLabel: string;
  timer: GeneratedExercise['timer'];
  trackingInputs: WodTrackingInput[];
  rounds?: number;
  repScheme?: number[];
  sets?: number;
  timeCapSeconds?: number;
  intervalSeconds?: number;
  intervalCount?: number;
  loads: WodLoad;
  lines: PageLine[];
  equipment: string[];
  patterns: string[];
  tags: string[];
  muscles: MuscleSet;
  visual?: WorkoutVisual;
  prescription: string;
  confidence: MasterWorkout['confidence'];
  warnings: string[];
};

export function generatePage(w: MasterWorkout, master: MasterDataset): WorkoutPage {
  const movements = movementIndex(master);
  const lines: PageLine[] = w.lines.map((line) => {
    const movement = line.movementId ? movements.get(line.movementId) : undefined;
    return {
      order: line.order,
      kind: line.kind,
      text: lineText(line, w.format === 'for_time' ? w.repScheme : undefined),
      name: line.name,
      ...(line.movementId ? { movementId: line.movementId } : {}),
      ...(line.quantity ? { quantity: line.quantity } : {}),
      quantityText: line.quantity ? quantityText(line.quantity) : line.repScheme ? `${line.repScheme.join('-')} reps` : '',
      ...(line.repScheme ? { repScheme: line.repScheme } : {}),
      ...(line.load ? { load: line.load } : {}),
      modifiers: line.modifiers,
      measure: line.quantity?.measure ?? movement?.measure ?? 'reps',
      ...(line.role ? { role: line.role } : {}),
      ...(movement ? { pattern: movement.pattern, muscles: movement.muscles } : {}),
      equipment: movement?.equipment ?? [],
      ...(movement?.note ? { cue: movement.note } : {}),
    };
  });
  return {
    id: w.id,
    slug: w.slug,
    name: w.name,
    named: w.named,
    ...(w.date ? { date: w.date } : {}),
    headline: headline(w),
    format: w.format,
    formatLabel: formatLabel(w.format),
    score: w.score,
    scoreLabel: scoreLabel(w.score),
    timer: timerFor(w),
    trackingInputs: w.trackingInputs,
    ...(w.rounds ? { rounds: w.rounds } : {}),
    ...(w.repScheme ? { repScheme: w.repScheme } : {}),
    ...(w.sets ? { sets: w.sets } : {}),
    ...(w.timeCapSeconds ? { timeCapSeconds: w.timeCapSeconds } : {}),
    ...(w.intervalSeconds ? { intervalSeconds: w.intervalSeconds } : {}),
    ...(w.intervalCount ? { intervalCount: w.intervalCount } : {}),
    loads: w.loads,
    lines,
    equipment: w.equipment,
    patterns: w.patterns,
    tags: w.tags,
    muscles: w.muscles,
    ...(w.visual ? { visual: w.visual } : {}),
    prescription: w.prescription,
    confidence: w.confidence,
    warnings: w.warnings,
  };
}

/* ---------- muscles ---------- */

/**
 * The muscles a workout works, tallied over its movement lines: a muscle that
 * is primary for any movement is a target (ranked by how often it appears),
 * everything else that appears is secondary. Capped so the picture stays legible.
 */
export function workoutMuscles(lines: WodLine[], movements: Map<string, MasterMovement>, cap = 6): MuscleSet {
  const primary = new Map<string, number>();
  const secondary = new Map<string, number>();
  for (const line of lines) {
    if (line.kind !== 'movement' || !line.movementId) continue;
    const m = movements.get(line.movementId);
    if (!m) continue;
    for (const x of m.muscles.target) primary.set(x, (primary.get(x) ?? 0) + 1);
    for (const x of m.muscles.secondary) secondary.set(x, (secondary.get(x) ?? 0) + 1);
  }
  const rank = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  const target = rank(primary).slice(0, cap);
  const rest = rank(secondary).filter((x) => !target.includes(x));
  return { target, secondary: rest.slice(0, cap) };
}

/** A stable key for a muscle set, so workouts with the same muscles share one picture. */
export function muscleKey(m: MuscleSet): string {
  const text = `${[...m.target].sort().join(',')}|${[...m.secondary].sort().join(',')}`;
  // FNV-1a, 32-bit, as 8 hex characters: short, deterministic, no dependency.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
