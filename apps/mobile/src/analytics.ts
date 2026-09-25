import type { MeasurementCategory, WorkoutExercise, WorkoutSession } from './types';

export type DashboardPoint = {
  sessionId: string;
  programId: string;
  completedAt: string;
  tonnage: number;
};

export type MetricPoint = {
  pointId: string;
  metricId: string;
  label: string;
  category: MeasurementCategory;
  unit: string;
  value: number;
  completedAt: string;
  sessionId: string;
};

export type DashboardSummary = {
  points: DashboardPoint[];
  totalTonnage: number;
  latestTonnage: number;
  completedSessionCount: number;
  metricPoints: MetricPoint[];
  performancePoints: MetricPoint[];
  anthropometricPoints: MetricPoint[];
};

export function calculateTonnage(sets: NonNullable<WorkoutSession['sets']>): number {
  return sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

export function calculateExerciseTonnage(exercise: WorkoutExercise): number {
  return calculateTonnage(exercise.sets);
}

export function buildDashboardSummary(sessions: WorkoutSession[]): DashboardSummary {
  const points = sessions.map((session) => ({
    sessionId: session.id,
    programId: session.programId,
    completedAt: session.completedAt,
    tonnage:
      session.tonnage ??
      (session.exercises ?? []).reduce((total, exercise) => total + exercise.tonnage, 0) ??
      calculateTonnage(session.sets ?? []),
  }));
  const metricPoints = sessions.flatMap((session) => {
    const exercisePoints = (session.exercises ?? []).map((exercise) => ({
      pointId: `${session.id}-${exercise.id}`,
      metricId: exercise.id,
      label: exercise.name,
      category: 'performance' as const,
      unit: 'lb',
      value: exercise.tonnage,
      completedAt: session.completedAt,
      sessionId: session.id,
    }));
    const measurementPoints = (session.measurements ?? []).map((measurement) => ({
      pointId: measurement.id,
      metricId: measurement.metricId,
      label: measurement.label,
      category: measurement.category,
      unit: measurement.unit,
      value: measurement.value,
      completedAt: measurement.recordedAt,
      sessionId: session.id,
    }));
    const rpePoint = session.rpeQuality
      ? [{
          pointId: `${session.id}-rpe-quality`,
          metricId: 'rpe-quality',
          label: 'RPE quality',
          category: 'performance' as const,
          unit: 'quality / 5',
          value: session.rpeQuality,
          completedAt: session.completedAt,
          sessionId: session.id,
        }]
      : [];

    return [...exercisePoints, ...measurementPoints, ...rpePoint];
  });

  return {
    points,
    totalTonnage: points.reduce((total, point) => total + point.tonnage, 0),
    latestTonnage: points.at(-1)?.tonnage ?? 0,
    completedSessionCount: points.length,
    metricPoints,
    performancePoints: metricPoints.filter((point) => point.category === 'performance'),
    anthropometricPoints: metricPoints.filter((point) => point.category === 'anthropometric'),
  };
}
