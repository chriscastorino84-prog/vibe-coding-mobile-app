import type { WorkoutRecord } from '../domain/workoutTypes';
import { openLocalDatabase } from './database';
import { enqueueSyncOperation } from './syncQueue';

export async function saveWorkout(workout: WorkoutRecord): Promise<void> {
  const database = await openLocalDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO workouts
      (workout_id, user_id, program_id, content_version, scheduled_week, scheduled_day,
       status, payload, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    workout.workoutId,
    workout.userId,
    workout.programId,
    workout.contentVersion,
    workout.scheduledWeek,
    workout.scheduledDay,
    workout.status,
    JSON.stringify(workout),
    workout.startedAt,
    workout.completedAt ?? null,
  );
  await enqueueSyncOperation({
    entityType: 'workout',
    entityId: workout.workoutId,
    operationType: 'update',
    payload: workout,
  });
}

export async function getWorkout(workoutId: string): Promise<WorkoutRecord | null> {
  const database = await openLocalDatabase();
  const row = await database.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM workouts WHERE workout_id = ?',
    workoutId,
  );
  return row ? (JSON.parse(row.payload) as WorkoutRecord) : null;
}
