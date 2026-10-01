import type { ProgramEnrollment, WorkoutExerciseResult } from './types';

export function validateProgramEnrollment(enrollment: ProgramEnrollment): void {
  if (!enrollment.id || !enrollment.userId || !enrollment.programVersionId) {
    throw new Error('Program enrollment identity is required');
  }
}

export function validateWorkoutExerciseResult(result: WorkoutExerciseResult): void {
  if (!result.scheduleRowId || !result.exerciseId) {
    throw new Error('Workout exercise identity is required');
  }
  if (result.sets.some((set) => set.prescribedReps < 0 || set.completedReps < 0)) {
    throw new Error('Workout repetitions cannot be negative');
  }
}
