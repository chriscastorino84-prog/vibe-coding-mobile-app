export interface WorkoutSetRecord {
  setNumber: number;
  prescribedReps: number;
  prescribedLoad: number | null;
  actualLoad: number | null;
  completedReps: number;
  actualEffortValue: number | null;
  actualEffortScale: 'RPE' | 'RIR' | null;
}

export interface WorkoutRecord {
  workoutId: string;
  userId: string;
  programId: string;
  contentVersion: string;
  scheduledWeek: number;
  scheduledDay: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  sets: WorkoutSetRecord[];
}
