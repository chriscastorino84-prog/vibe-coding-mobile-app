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

/** The paragraphs under a workout's name, in Chris's voice. Built from the columns by workoutIntro(). */
export type WorkoutIntro = {
  /** What the workout is and how it is scored, in two or three short sentences. */
  what: string;
  /** How to pace it: the one thing per movement that keeps you moving. */
  how: string;
  /** How to make it yours: the step down for each movement, and the loads. */
  scale: string;
  /** The story behind a named workout (benchmarks.json), when there is one. */
  background?: string;
  /** girl | hero | benchmark, when known. */
  kind?: string;
};

export type ScalingTable = { movements: Record<string, { scale: string; cue: string }> };
export type BenchmarkTable = { workouts: Record<string, { kind: string; background: string }> };

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
  /** Semantic tags from the glossary: partner, ladder, rx, buy-in, cash-out, stations. */
  tags: string[];
  muscles: MuscleSet;
  visual?: WorkoutVisual;
  /** The introduction under the name: what it is, how to run it, how to scale it, and the story behind a named one. */
  intro: WorkoutIntro;
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
      if (w.tags?.includes('stations')) return `${w.rounds ?? 1} round${(w.rounds ?? 1) === 1 ? '' : 's'} of timed stations`;
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
  intro: WorkoutIntro;
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
    intro: w.intro,
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
  intro: WorkoutIntro;
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
    intro: w.intro,
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

/* ---------- the introduction ---------- */

type IntroInput = Omit<MasterWorkout, 'intro'>;

function minutesText(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m === 1 ? 'one minute' : `${m} minutes`;
}

function listText(items: string[]): string {
  const x = items.filter(Boolean);
  if (x.length <= 1) return x[0] ?? '';
  return `${x.slice(0, -1).join(', ')} and ${x[x.length - 1]}`;
}

/** "What it is": the format in plain words, with the score. Point first, short closer. */
function whatText(w: IntroInput, work: WodLine[]): string {
  const names = work.map((l) => l.name.toLowerCase());
  const few = names.length <= 4 ? listText(names) : `${names.length} movements`;
  const cap = w.timeCapSeconds ? minutesText(w.timeCapSeconds) : null;
  switch (w.format) {
    case 'for_time': {
      if (w.repScheme) return `${w.repScheme.join('-')} reps of ${few}, as fast as you can with good form. The numbers drop every round. The standard doesn't. Your score is the clock${cap ? `, with a ${cap} cap` : ''}.`;
      if (w.rounds && w.rounds > 1) return `${w.rounds} rounds of ${few}, as fast as you can with good form. Your score is the clock${cap ? `, with a ${cap} cap` : ''}.`;
      return `${names.length > 1 ? 'Work through the list' : `Do the ${few}`} as fast as you can with good form. Your score is the clock${cap ? `, with a ${cap} cap` : ''}.`;
    }
    case 'amrap':
      return `${cap ? `${cap[0].toUpperCase()}${cap.slice(1)} on the clock` : 'A set time on the clock'}. Get through the list as many times as you can. Your score is rounds, plus whatever reps you got into the last one.`;
    case 'emom':
      return `Every ${w.intervalSeconds && w.intervalSeconds !== 60 ? minutesText(w.intervalSeconds) : 'minute'} on the minute${w.intervalCount ? ` for ${w.intervalCount} rounds` : ''}: do the work, then rest whatever is left. Faster work buys more rest. Your score is total reps.`;
    case 'death_by':
      return `Minute one, one rep. Minute two, two reps. Keep adding one until you can't finish inside the minute. Your score is the last full minute, plus the reps you got in the one that beat you.`;
    case 'tabata':
      return `Tabata: eight rounds of 20 seconds on and 10 seconds off, per movement. Count the reps. Your score is the total.`;
    case 'interval': {
      if (w.tags.includes('stations')) {
        const rest = w.lines.find((l) => l.kind === 'rest');
        const each = work[0]?.quantity ? minutesText(work[0].quantity.value) : 'a set time';
        return `${w.rounds ?? 1} round${(w.rounds ?? 1) === 1 ? '' : 's'}. ${names.length} stations, ${each} at each${rest?.quantity ? `, then ${minutesText(rest.quantity.value)} off` : ''}. Count every rep. The total is your score.`;
      }
      return `Work in intervals${cap ? ` on a ${cap} clock` : ''}. ${w.score === 'distance' ? 'Your score is total distance.' : 'Count the reps. The total is your score.'}`;
    }
    case 'strength':
      return `${w.sets ? `${w.sets} sets` : 'Sets'}${w.repScheme ? ` of ${w.repScheme.join('-')} reps` : ''}. Build to a heavy set for today, not a lifetime best. Rest as long as you need between sets. Your score is the heaviest load you made.`;
    case 'max_load':
      return `Build to a heavy ${few}${w.intervalSeconds ? `, one attempt every ${minutesText(w.intervalSeconds)}` : ''}. Heavy means heavy for today. Your score is the top load.`;
    case 'skill':
      return `Not for time. Practice: ${few}. Move well, rest when the quality drops, and stop before you're sloppy.`;
    default:
      return `${few[0]?.toUpperCase() ?? ''}${few.slice(1)}. Read the lines below and run it at a pace you can hold.`;
  }
}

/** "How to run it": the cues, one per movement, and a pacing rule for the format. */
function howText(w: IntroInput, work: WodLine[], movements: Map<string, MasterMovement>, scaling?: ScalingTable): string {
  const lead = w.format === 'amrap' || w.format === 'emom' ? 'Pick a pace you could hold for the whole clock, then hold it.'
    : w.format === 'for_time' && (w.rounds ?? 1) >= 3 ? `Round one should feel too easy. That's the pace.`
      : w.format === 'for_time' && w.repScheme ? 'Break the big sets before you have to, not after you fail.'
        : w.format === 'strength' || w.format === 'max_load' ? 'Warm up with the bar, add weight in big jumps early and small ones late.'
          : w.tags.includes('stations') ? 'Move the second the clock says go, and keep a number in your head at every station.'
            : 'Steady beats fast. Keep moving.';
  const seen = new Set<string>();
  const cues: string[] = [];
  for (const l of work) {
    if (!l.movementId || seen.has(l.movementId)) continue;
    seen.add(l.movementId);
    const cue = scaling?.movements[l.movementId]?.cue;
    const name = movements.get(l.movementId)?.name ?? l.name;
    if (cue) cues.push(`${name}: ${cue[0].toLowerCase()}${cue.slice(1)}`);
  }
  return [lead, ...cues.slice(0, 5)].join(' ');
}

/** "Make it yours": the step down for each movement, then the loads. */
function scaleText(w: IntroInput, work: WodLine[], movements: Map<string, MasterMovement>, scaling?: ScalingTable): string {
  const seen = new Set<string>();
  const steps: string[] = [];
  for (const l of work) {
    if (!l.movementId || seen.has(l.movementId)) continue;
    seen.add(l.movementId);
    const scale = scaling?.movements[l.movementId]?.scale;
    const name = movements.get(l.movementId)?.name ?? l.name;
    if (scale) steps.push(`${name}: ${scale[0].toLowerCase()}${scale.slice(1)}`);
  }
  const hasLoad = work.some((l) => l.load) || !!(w.loads.men || w.loads.women);
  const loads = hasLoad ? 'The loads are the prescribed ones. Pick a weight you could do the first set unbroken when you are fresh, even if that is half of what is written.' : '';
  const closer = w.format === 'strength' || w.format === 'max_load' ? 'A heavy single with a round back is not a lift. Stop a notch before form goes.' : 'Scaled and finished beats prescribed and quit.';
  return [steps.length ? `${steps.slice(0, 6).join(' ')}` : '', loads, closer].filter(Boolean).join(' ');
}

const normaliseName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The introduction under a workout's name, built from its columns, the scaling table and the benchmark notes. */
export function workoutIntro(w: IntroInput, movements: Map<string, MasterMovement>, tables: { scaling?: ScalingTable; benchmarks?: BenchmarkTable } = {}): WorkoutIntro {
  const work = w.lines.filter((l) => l.kind === 'movement');
  const bench = w.named && tables.benchmarks ? tables.benchmarks.workouts[normaliseName(w.name)] : undefined;
  return {
    what: whatText(w, work),
    how: howText(w, work, movements, tables.scaling),
    scale: scaleText(w, work, movements, tables.scaling),
    ...(bench ? { background: bench.background, kind: bench.kind } : {}),
  };
}
