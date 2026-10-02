export type ProgressionMethod = '%1RM' | 'RPE' | 'RIR' | 'STD';
export type RecordStatus = 'draft' | 'published' | 'retired';
export type ExerciseStatus = 'active' | 'retired';

export type Exercise = {
  id: string;
  displayName: string;
  normalizedName: string;
  description: string | null;
  instructions?: string | null;
  category: string | null;
  primaryMuscleGroups: string[];
  equipment: string[];
  movementPattern: string | null;
  status: ExerciseStatus;
};

export type ProgramSetup = {
  exerciseIds: string[];
  progressionMethod: ProgressionMethod;
  progressionValue: number | null;
  durationWeeks: number;
  trainingDaysPerWeek: number;
  sets: number;
  reps: number;
  maxExercisesPerWorkout?: number;
  maxSetsPerExercise?: number;
  maxRepsPerSet?: number;
  warmupEnabled?: boolean;
  cooldownEnabled?: boolean;
  discoveryEnabled?: boolean;
  strengthFormulaVersion?: string;
};

export type ProgramSubWorkout = {
  id?: string;
  childProgramVersionId: string;
  relationshipType: 'warmup' | 'cooldown' | 'discovery';
  launchPosition: 'before_workout' | 'after_workout' | 'program_setup';
  required: boolean;
  returnBehavior: 'return_to_parent_workout' | 'return_to_parent_completion' | 'return_to_parent_program';
  displayLabel: string;
};

export type ProgramAnalyticsDefinition = {
  metricKey: string;
  audience: 'user' | 'coach' | 'both';
  displayLabel: string;
  unit?: string;
  aggregation: 'sum' | 'average' | 'median' | 'minimum' | 'maximum' | 'percentage';
  enabled: boolean;
};

export type ProgramAggregateMetric = {
  programVersionId: string;
  metricKey: string;
  periodStart: string;
  periodEnd: string;
  participantCount: number;
  numericValue?: number;
  percentageValue?: number;
};

export type ProgramCycleSnapshot = {
  id: string;
  enrollmentId: string;
  programVersionId: string;
  completedAt: string;
  dashboardConfig: Record<string, unknown>;
  metrics: Array<{
    metricKey: string;
    numericValue?: number;
    textValue?: string;
    unit?: string;
  }>;
};

export type ProgramScheduleRow = {
  id: string;
  exerciseId: string;
  weekNumber: number;
  dayNumber: number;
  exerciseOrder: number;
  progressionMethod: ProgressionMethod;
  progressionValue: number | null;
  sets: number;
  reps: number;
};

export type ProgramVersion = {
  id: string;
  programId: string;
  versionNumber: number;
  status: RecordStatus;
  durationWeeks: number;
  trainingDaysPerWeek: number;
  rows: ProgramScheduleRow[];
  template?: Pick<ProgramSetup, 'maxExercisesPerWorkout' | 'maxSetsPerExercise' | 'maxRepsPerSet' | 'warmupEnabled' | 'cooldownEnabled' | 'discoveryEnabled' | 'strengthFormulaVersion'>;
  subWorkouts?: ProgramSubWorkout[];
};

export type ProgramEnrollment = {
  id: string;
  userId: string;
  programVersionId: string;
  status: 'active' | 'completed' | 'cancelled';
  discoveryStatus: 'not_started' | 'in_progress' | 'complete';
  subWorkouts?: ProgramSubWorkout[];
};

export type WorkoutSetInput = {
  id: string;
  prescribedLoad: number | null;
  prescribedReps: number;
  prescribedEffort: number | null;
  actualLoad: number | null;
  completedReps: number;
  actualEffort: number | null;
  effortScale: 'RPE' | 'RIR' | null;
};

export type WorkoutExerciseResult = {
  scheduleRowId: string;
  exerciseId: string;
  sets: WorkoutSetInput[];
  flagPolarity: 'positive' | 'negative' | 'mixed' | null;
};

export type BodyMeasurementInput = {
  bodyweight: number;
  bodyweightUnit: 'kg' | 'lb';
  bodyCompositionPercent: number;
};

export type ProgressPhotoMetadata = {
  id: string;
  userId: string;
  workoutId: string | null;
  storageKey: string;
  sharing: 'private' | 'shared';
};

export function exerciseFromRow(row: Record<string, unknown>): Exercise {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    normalizedName: String(row.normalized_name),
    description: typeof row.description === 'string' ? row.description : null,
    instructions: typeof row.instructions === 'string' ? row.instructions : null,
    category: typeof row.category === 'string' ? row.category : null,
    primaryMuscleGroups: Array.isArray(row.primary_muscle_groups)
      ? row.primary_muscle_groups.filter((value): value is string => typeof value === 'string')
      : [],
    equipment: Array.isArray(row.equipment)
      ? row.equipment.filter((value): value is string => typeof value === 'string')
      : [],
    movementPattern: typeof row.movement_pattern === 'string' ? row.movement_pattern : null,
    status: row.status === 'retired' ? 'retired' : 'active',
  };
}
