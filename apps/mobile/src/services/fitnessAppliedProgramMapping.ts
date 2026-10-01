import type { ContentPackage } from '@fitness-applied/contracts';

import { seedPrograms } from '../data/seedPrograms';
import type { Program, ProgramSection } from '../types';

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

function mapSections(value: unknown): ProgramSection[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const sections = value.flatMap((sectionValue, sectionIndex) => {
    const section = asRecord(sectionValue);
    if (!section || !Array.isArray(section.exercises)) return [];
    const exercises = section.exercises.flatMap((exerciseValue, exerciseIndex) => {
      const exercise = asRecord(exerciseValue);
      if (!exercise) return [];
      const name = stringValue(exercise, 'name', '');
      if (!name) return [];
      return [{
        id: stringValue(exercise, 'id', `${sectionIndex}-${exerciseIndex}`),
        name,
        prescription: stringValue(exercise, 'prescription', ''),
        ...(typeof exercise.description === 'string' ? { description: exercise.description } : {}),
        ...(typeof exercise.focus === 'string' ? { focus: exercise.focus } : {}),
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

function canonicalProgramId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return packageIdAliases[value.toLowerCase()] ?? value;
}

function mapProgram(fallback: Program, value: unknown): Program {
  const content = asRecord(value);
  if (!content) return fallback;

  const sections = mapSections(content.sections);
  return {
    ...fallback,
    name: stringValue(content, 'name', fallback.name),
    description: stringValue(content, 'description', fallback.description),
    phase: stringValue(content, 'phase', fallback.phase),
    tone: stringValue(content, 'tone', fallback.tone),
    accent: stringValue(content, 'accent', fallback.accent),
    ...(sections ? { sections } : {}),
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

  return fallbackPrograms.map((fallback) => {
    const content = contentById.get(fallback.id);
    return content ? mapProgram(fallback, content) : fallback;
  });
}
