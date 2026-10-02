import { describe, expect, it } from 'vitest';

import { parseWod } from './wodConversionEngine';

describe('WOD conversion engine', () => {
  it('extracts AMRAP time cap, rounds, movements, and tracking columns', () => {
    expect(parseWod('AMRAP 12 minutes: 5 pull-ups, 10 push-ups')).toMatchObject({
      workoutType: 'amrap',
      timeCapSeconds: 720,
      trackingInputs: ['reps', 'rounds'],
    });
  });

  it('extracts timed-set and interval columns', () => {
    expect(parseWod('Tabata: 20 seconds work, 10 seconds rest x 8')).toMatchObject({
      workoutType: 'timed_sets',
      workDurationSeconds: 20,
      restSeconds: 10,
      sets: 8,
    });
  });

  it('splits compact set-by-rep prescriptions into separate columns', () => {
    expect(parseWod('Back squat 5x3')).toMatchObject({ workoutType: 'standard', sets: 5, reps: 3 });
  });
});
