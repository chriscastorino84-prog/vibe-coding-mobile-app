import type { ContentPackage } from '@fitness-applied/contracts';

import { seedPrograms } from '../data/seedPrograms';
import type { Program, ProgramExercise, ProgramSection, WorkoutDay, WorkoutWeek } from '../types';

export const FITNESS_APPLIED_PROGRAM_IDS = {
  warmUp: 'warm-up',
  coolDown: 'cool-down',
} as const;

const packageIdAliases: Record<string, string> = {
  'warm-up': FITNESS_APPLIED_PROGRAM_IDS.warmUp,
  warmup: FITNESS_APPLIED_PROGRAM_IDS.warmUp,
  'warm_up': FITNESS_APPLIED_PROGRAM_IDS.warmUp,
  'cool-down': FITNESS_APPLIED_PROGRAM_IDS.coolDown,
  cooldown: FITNESS_APPLIED_PROGRAM_IDS.coolDown,
  'cool_down': FITNESS_APPLIED_PROGRAM_IDS.coolDown,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringValue(record: Record<string, unknown>, key: string, fallback: string): string {
  return typeof record[key] === 'string' && record[key] ? record[key] as string : fallback;
}

function localizedValue(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value) return value;
  const record = asRecord(value);
  if (!record) return fallback;
  const preferred = record['en-US'] ?? Object.values(record)[0];
  return typeof preferred === 'string' && preferred ? preferred : fallback;
}

function workoutTypeValue(value: unknown): ProgramExercise['workoutType'] {
  return value === 'amrap' || value === 'timed_sets' || value === 'standard' ? value : undefined;
}

function mapSections(value: unknown): ProgramSection[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const sections = value.flatMap((sectionValue, sectionIndex) => {
    const section = asRecord(sectionValue);
    if (!section || !Array.isArray(section.exercises)) return [];
    const exercises = section.exercises.flatMap((exerciseValue, exerciseIndex) => {
      const exercise = asRecord(exerciseValue);
      if (!exercise) return [];
      const snapshot = asRecord(exercise.exercise) ?? exercise;
      const name = localizedValue(snapshot.name ?? exercise.name, '');
      if (!name) return [];
      const workoutType = workoutTypeValue(exercise.workoutType);
      return [{
        id: stringValue(snapshot, 'exerciseId', stringValue(exercise, 'id', `${sectionIndex}-${exerciseIndex}`)),
        name,
        prescription: localizedValue(exercise.prescription, ''),
        ...(exercise.description ? { description: localizedValue(exercise.description, '') } : {}),
        ...(exercise.instructions || snapshot.instructions
          ? { instructions: localizedValue(exercise.instructions ?? snapshot.instructions, '') }
          : {}),
        ...(exercise.focus ? { focus: localizedValue(exercise.focus, '') } : {}),
        ...(workoutType === 'amrap' || workoutType === 'timed_sets' || workoutType === 'standard'
          ? { workoutType } : {}),
        ...(typeof exercise.workDurationSeconds === 'number' ? { workDurationSeconds: exercise.workDurationSeconds } : {}),
        ...(typeof exercise.intervalSeconds === 'number' ? { intervalSeconds: exercise.intervalSeconds } : {}),
        ...(typeof exercise.restSeconds === 'number' ? { restSeconds: exercise.restSeconds } : {}),
        ...(typeof exercise.sets === 'number' ? { sets: exercise.sets } : {}),
        ...(typeof exercise.reps === 'string' ? { reps: exercise.reps } : {}),
        ...(asRecord(exercise.timer) ? { timer: exercise.timer as ProgramExercise['timer'] } : {}),
        ...(asRecord(exercise.tracking) ? { tracking: exercise.tracking as ProgramExercise['tracking'] } : {}),
        ...(typeof exercise.sets === 'number' ? { sets: exercise.sets } : {}),
        ...(typeof exercise.reps === 'string' ? { reps: exercise.reps } : {}),
      }];
    });
    if (exercises.length === 0) return [];
    return [{
      id: stringValue(section, 'id', `section-${sectionIndex + 1}`),
      title: stringValue(section, 'title', `Section ${sectionIndex + 1}`),
      ...(typeof section.summary === 'string' ? { summary: section.summary } : {}),
      ...(typeof section.rounds === 'string' ? { rounds: section.rounds } : {}),
      exercises,
    }];
  });

  return sections.length > 0 ? sections : undefined;
}

function mapWorkoutWeeks(value: unknown): WorkoutWeek[] | undefined {
  const sections = mapSections(value);
  if (!sections?.length) return undefined;
  const weeks = new Map<number, WorkoutDay[]>();
  sections.forEach((section, index) => {
    const match = section.id.match(/week-(\d+)-day-(\d+)/i);
    const weekNumber = Number(match?.[1] ?? 1);
    const dayNumber = Number(match?.[2] ?? index + 1);
    const day: WorkoutDay = {
      id: section.id,
      dayNumber: Math.min(3, Math.max(1, dayNumber)) as 1 | 2 | 3,
      title: section.title,
      focus: section.summary ?? '',
      exercises: section.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets ?? 1,
        reps: exercise.reps ?? exercise.prescription,
        ...(exercise.instructions ? { instructions: exercise.instructions } : {}),
        ...(exercise.workoutType ? { workoutType: exercise.workoutType } : {}),
        ...(exercise.restSeconds === undefined ? {} : { restSeconds: exercise.restSeconds }),
        ...(exercise.workDurationSeconds === undefined ? {} : { workDurationSeconds: exercise.workDurationSeconds }),
        ...(exercise.intervalSeconds === undefined ? {} : { intervalSeconds: exercise.intervalSeconds }),
      })),
    };
    weeks.set(weekNumber, [...(weeks.get(weekNumber) ?? []), day]);
  });
  return [...weeks.entries()].sort(([left], [right]) => left - right).map(([weekNumber, workoutDays]) => ({ weekNumber, workoutDays }));
}

function canonicalProgramId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return packageIdAliases[value.toLowerCase()] ?? value;
}

function mapProgram(fallback: Program, value: unknown): Program {
  const content = asRecord(value);
  if (!content) return fallback;

  const sections = mapSections(content.sections);
  const workoutWeeks = mapWorkoutWeeks(content.sections);
  const programType = content.kind === 'static_session' ? 'cardio' : fallback.type;
  const marketplace = asRecord(content.marketplace);
  return {
    ...fallback,
    id: stringValue(content, 'programId', fallback.id),
    name: localizedValue(content.title, stringValue(content, 'name', fallback.name)),
    type: programType,
    ...(typeof content.category === 'string' ? { category: content.category } : {}),
    status: 'current',
    description: localizedValue(content.description, fallback.description),
    phase: localizedValue(content.goal, stringValue(content, 'phase', fallback.phase)),
    tone: stringValue(content, 'tone', fallback.tone),
    accent: stringValue(content, 'accent', fallback.accent),
    ...(marketplace && typeof marketplace.status === 'string' && typeof marketplace.accessTier === 'string' && typeof marketplace.adPolicy === 'string' ? {
      marketplaceStatus: marketplace.status as Program['marketplaceStatus'],
      accessTier: marketplace.accessTier as Program['accessTier'],
      adPolicy: marketplace.adPolicy as Program['adPolicy'],
    } : {}),
    ...(sections ? { sections } : {}),
    ...(workoutWeeks ? { workoutWeeks } : {}),
  };
}

/**
 * Merges published Fitness-Applied records into the app's existing Program
 * model. Static warm-up and cool-down sections remain available when a
 * package omits those records or only publishes metadata.
 */
export function mapContentPackageToPrograms(
  contentPackage: ContentPackage,
  fallbackPrograms: Program[] = seedPrograms,
): Program[] {
  const contentById = new Map<string, unknown>();
  for (const program of contentPackage.programs) {
    const record = asRecord(program);
    const id = canonicalProgramId(
      record?.id ?? record?.programId ?? record?.programKey ?? record?.productKey ?? record?.slug,
    );
    if (id) contentById.set(id, program);
  }

  if (contentById.size === 0) return fallbackPrograms;
  const fallbackById = new Map(fallbackPrograms.map((program) => [program.id, program]));
  return [...contentById.entries()].map(([id, content]) => mapProgram(
    fallbackById.get(id) ?? {
      id,
      name: id,
      type: 'resistance',
      status: 'current',
      description: '',
      phase: 'Program',
      tone: 'Published program',
      accent: '#D96C4A',
      startedAt: new Date(0).toISOString(),
    },
    content,
  ));
}
