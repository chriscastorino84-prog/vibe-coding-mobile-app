export type ProgramType = 'warm-up' | 'cool-down' | 'resistance' | 'cardio';

export type ProgramStatus = 'current' | 'closed';

export type Program = {
  id: string;
  name: string;
  type: ProgramType;
  status: ProgramStatus;
  description: string;
  phase: string;
  tone: string;
  accent: string;
  startedAt: string;
  closedAt?: string;
  startingPhotoUri?: string;
  endingPhotoUri?: string;
  sections?: ProgramSection[];
  workoutWeeks?: WorkoutWeek[];
};

export type ProgramExercise = {
  id: string;
  name: string;
  prescription: string;
  description?: string;
  focus?: string;
};

export type ProgramSection = {
  id: string;
  title: string;
  summary?: string;
  rounds?: string;
  exercises: ProgramExercise[];
};

export type MeasurementCategory = 'performance' | 'anthropometric';

export type MeasurementUnit = 'lb' | 'kg' | 'in' | 'cm' | 'count';

export type MeasurementDefinition = {
  id: string;
  label: string;
  category: MeasurementCategory;
  unit: MeasurementUnit;
};

export type WorkoutSet = {
  id: string;
  weight: number;
  reps: number;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
  tonnage: number;
};

export type RpeQuality = 1 | 2 | 3 | 4 | 5;

export type WorkoutDayExercise = {
  id: string;
  name: string;
  sets: number;
  setLabel?: string;
  reps: string;
  rpePrescription?: string;
};

export type WorkoutDay = {
  id: string;
  dayNumber: 1 | 2 | 3;
  title: string;
  focus: string;
  exercises: WorkoutDayExercise[];
};

export type WorkoutWeek = {
  weekNumber: number;
  workoutDays: WorkoutDay[];
};

export type ProgressPhotoCheckpoint = {
  id: string;
  programId: string;
  weekNumber: number;
  recordedAt: string;
  photoUri?: string;
};

export type MeasurementObservation = {
  id: string;
  metricId: string;
  label: string;
  category: MeasurementCategory;
  unit: MeasurementUnit;
  value: number;
  recordedAt: string;
  sessionId?: string;
};

export type WorkoutSession = {
  id: string;
  programId: string;
  workoutDayId?: string;
  completedAt: string;
  exercises?: WorkoutExercise[];
  measurements?: MeasurementObservation[];
  rpeQuality?: RpeQuality;
  notes?: string;
};

export type Trophy = {
  id: string;
  name: string;
  description: string;
  category: 'workout' | 'measurement' | 'consistency' | 'exploration';
  icon: string;
  unlockedAt: string;
  attainmentSessionId: string;
  statsSnapshot: TrophyStatsSnapshot;
  photoUri?: string;
};

export type TrophyStatsSnapshot = {
  exercises: Array<{
    name: string;
    tonnage: number;
  }>;
  measurements: MeasurementObservation[];
};
