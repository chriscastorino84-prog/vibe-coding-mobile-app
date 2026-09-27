import type { Exercise, ProgramScheduleRow, ProgramSetup } from './types';

export type ScheduleValidationIssue = {
  field: keyof ProgramSetup | 'exerciseIds';
  message: string;
};

export type ScheduleGenerationResult =
  | { ok: true; rows: ProgramScheduleRow[] }
  | { ok: false; issues: ScheduleValidationIssue[] };

const MAX_WEEKS = 52;
const MAX_TRAINING_DAYS = 7;
const MAX_SETS = 20;
const MAX_REPS = 100;

export function validateProgramSetup(setup: ProgramSetup, exercises: Exercise[]): ScheduleValidationIssue[] {
  const issues: ScheduleValidationIssue[] = [];

  if (!Number.isInteger(setup.durationWeeks) || setup.durationWeeks < 1 || setup.durationWeeks > MAX_WEEKS) {
    issues.push({ field: 'durationWeeks', message: `Program duration must be from 1 to ${MAX_WEEKS} weeks.` });
  }
  if (!Number.isInteger(setup.trainingDaysPerWeek) || setup.trainingDaysPerWeek < 1 || setup.trainingDaysPerWeek > MAX_TRAINING_DAYS) {
    issues.push({ field: 'trainingDaysPerWeek', message: `Training days must be from 1 to ${MAX_TRAINING_DAYS} per week.` });
  }
  if (!Number.isInteger(setup.sets) || setup.sets < 1 || setup.sets > MAX_SETS) {
    issues.push({ field: 'sets', message: `Sets must be from 1 to ${MAX_SETS}.` });
  }
  if (!Number.isInteger(setup.reps) || setup.reps < 1 || setup.reps > MAX_REPS) {
    issues.push({ field: 'reps', message: `Reps must be from 1 to ${MAX_REPS}.` });
  }
  if (setup.exerciseIds.length === 0) {
    issues.push({ field: 'exerciseIds', message: 'Select at least one exercise.' });
  }
  if (new Set(setup.exerciseIds).size !== setup.exerciseIds.length) {
    issues.push({ field: 'exerciseIds', message: 'Each exercise may be selected only once in the initial setup.' });
  }

  const selectedIds = new Set(exercises.map((exercise) => exercise.id));
  if (setup.exerciseIds.some((id) => !selectedIds.has(id))) {
    issues.push({ field: 'exerciseIds', message: 'Every selected exercise must exist in the active exercise catalog.' });
  }

  if (setup.progressionMethod === '%1RM' && (!Number.isFinite(setup.progressionValue) || (setup.progressionValue ?? 0) <= 0 || (setup.progressionValue ?? 0) > 100)) {
    issues.push({ field: 'progressionValue', message: 'The %1RM value must be greater than 0 and no more than 100.' });
  }
  if ((setup.progressionMethod === 'RPE' || setup.progressionMethod === 'RIR')
    && (!Number.isFinite(setup.progressionValue) || (setup.progressionValue ?? -1) < 0 || (setup.progressionValue ?? 11) > 10)) {
    issues.push({ field: 'progressionValue', message: 'The RPE/RIR value must be between 0 and 10.' });
  }

  return issues;
}

export function generateProgramSchedule(setup: ProgramSetup, exercises: Exercise[]): ScheduleGenerationResult {
  const issues = validateProgramSetup(setup, exercises);
  if (issues.length > 0) return { ok: false, issues };

  const rows: ProgramScheduleRow[] = [];
  for (let weekNumber = 1; weekNumber <= setup.durationWeeks; weekNumber += 1) {
    for (let dayNumber = 1; dayNumber <= setup.trainingDaysPerWeek; dayNumber += 1) {
      setup.exerciseIds.forEach((exerciseId, exerciseOrder) => {
        rows.push({
          id: `w${weekNumber}-d${dayNumber}-e${exerciseOrder + 1}`,
          exerciseId,
          weekNumber,
          dayNumber,
          exerciseOrder,
          progressionMethod: setup.progressionMethod,
          progressionValue: setup.progressionValue,
          sets: setup.sets,
          reps: setup.reps,
        });
      });
    }
  }

  return { ok: true, rows };
}
