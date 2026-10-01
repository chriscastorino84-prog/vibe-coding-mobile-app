export type ContentStatus = 'draft' | 'published' | 'retired';

export interface ContentPackageMetadata {
  packageId: string;
  schemaVersion: string;
  contentVersion: string;
  locale: string;
  publishedAt: string | null;
  contentHash: string;
  minClientVersion: string;
  status: ContentStatus;
}

export interface ContentProgramExercise {
  id: string;
  name: string;
  prescription?: string;
  description?: string;
  focus?: string;
  workoutType?: 'standard' | 'amrap' | 'timed_sets';
  workDurationSeconds?: number;
  intervalSeconds?: number;
  restSeconds?: number;
  sets?: number;
  reps?: string;
}

export interface ContentProgramSection {
  id: string;
  title: string;
  summary?: string;
  rounds?: string;
  exercises: ContentProgramExercise[];
}

/**
 * The published program shape is intentionally small. The mobile app can
 * safely ignore authoring-only fields while still rendering static sections.
 */
export interface ContentProgram {
  id: string;
  name?: string;
  type?: string;
  category?: string;
  description?: string;
  phase?: string;
  tone?: string;
  accent?: string;
  sections?: ContentProgramSection[];
  workoutWeeks?: unknown[];
  template?: ProgramTemplate;
  subWorkouts?: ProgramSubWorkout[];
  marketplace?: {
    status: 'private' | 'published' | 'retired';
    accessTier: 'free' | 'paid';
    adPolicy: 'none' | 'free_programs_only';
  };
  analytics?: {
    coachMetrics: string[];
    userMetrics: string[];
    leaderboardEnabled: boolean;
  };
}

export const WOD_MARKETPLACE_CATEGORY = 'WOD' as const;

export function isPublishedWodProgram(value: ContentProgram): boolean {
  return value.category === WOD_MARKETPLACE_CATEGORY
    && value.marketplace?.status === 'published'
    && value.marketplace.accessTier === 'free';
}

export interface ProgramTemplate {
  maxExercisesPerWorkout: number;
  maxSetsPerExercise: number;
  maxRepsPerSet: number;
  warmupEnabled: boolean;
  cooldownEnabled: boolean;
  discoveryEnabled: boolean;
  strengthFormulaVersion: string;
}

export type ProgramSubWorkoutRelationship = 'warmup' | 'cooldown' | 'discovery';
export type ProgramSubWorkoutLaunchPosition = 'before_workout' | 'after_workout' | 'program_setup';
export type ProgramSubWorkoutReturnBehavior =
  | 'return_to_parent_workout'
  | 'return_to_parent_completion'
  | 'return_to_parent_program';

export interface ProgramSubWorkout {
  relationshipType: ProgramSubWorkoutRelationship;
  programId: string;
  version: string;
  launchPosition: ProgramSubWorkoutLaunchPosition;
  required: boolean;
  returnBehavior: ProgramSubWorkoutReturnBehavior;
  displayLabel: string;
}

export interface ContentPackage extends ContentPackageMetadata {
  programs: ContentProgram[];
  calculators: unknown[];
  recipes: unknown[];
  shoppingListTemplates: unknown[];
  trophyDefinitions: unknown[];
  analyticsDefinitions: unknown[];
}

export function isPublishedPackage(value: ContentPackageMetadata): boolean {
  return value.status === 'published' && value.publishedAt !== null && /^[a-f0-9]{64}$/i.test(value.contentHash);
}
