import type { WorkoutRecord } from '../../domain/workoutTypes';

export interface ExportBundle {
  exportedAt: string;
  formatVersion: '1.0.0';
  workouts: WorkoutRecord[];
  measurements: unknown[];
  trophies: unknown[];
}

export function buildDataExport(input: Omit<ExportBundle, 'exportedAt' | 'formatVersion'>): string {
  const bundle: ExportBundle = {
    ...input,
    exportedAt: new Date().toISOString(),
    formatVersion: '1.0.0',
  };
  return JSON.stringify(bundle, null, 2);
}
