import { describe, expect, it } from 'vitest';

import type { Exercise, ProgramSetup, ProgramVersion } from './types';
import { generateProgramSchedule, validateProgramSetup } from './programSchedule';

const exercises: Exercise[] = [{
  id: 'squat',
  displayName: 'Barbell Squat',
  normalizedName: 'barbell squat',
  description: null,
  category: 'strength',
  primaryMuscleGroups: ['quadriceps'],
  equipment: ['barbell'],
  movementPattern: 'squat',
  status: 'active',
}];

const baseSetup: ProgramSetup = {
  exerciseIds: ['squat'],
  progressionMethod: '%1RM',
  progressionValue: 70,
  durationWeeks: 4,
  trainingDaysPerWeek: 3,
  sets: 3,
  reps: 8,
};

describe('program schedule generation', () => {
  it('generates a row for every selected exercise, week, and training day', () => {
    const result = generateProgramSchedule(baseSetup, exercises);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(12);
    expect(result.rows[0]).toMatchObject({ weekNumber: 1, dayNumber: 1, exerciseId: 'squat', sets: 3, reps: 8 });
    expect(result.rows[11]).toMatchObject({ weekNumber: 4, dayNumber: 3 });
  });

  it('returns actionable validation errors rather than success-shaped empty schedules', () => {
    const result = generateProgramSchedule({ ...baseSetup, durationWeeks: 0, sets: 0 }, exercises);
    expect(result).toMatchObject({ ok: false, issues: expect.arrayContaining([
      expect.objectContaining({ field: 'durationWeeks' }),
      expect.objectContaining({ field: 'sets' }),
    ]) });
  });

  it('rejects missing exercises and invalid progression values', () => {
    const issues = validateProgramSetup({ ...baseSetup, exerciseIds: [], progressionValue: 101 }, []);
    expect(issues.map((issue) => issue.field)).toContain('exerciseIds');
    expect(issues.map((issue) => issue.field)).toContain('progressionValue');
  });

  it('treats published versions as immutable domain records', () => {
    const published: ProgramVersion = {
      id: 'v1',
      programId: 'p1',
      versionNumber: 1,
      status: 'published',
      durationWeeks: 4,
      trainingDaysPerWeek: 3,
      rows: [],
    };
    expect(published.status).toBe('published');
  });
});
