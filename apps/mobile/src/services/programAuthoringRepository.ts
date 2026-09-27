import type { ProgramScheduleRow, ProgramSetup } from '../domain/types';
import { assertProgramStaff } from './catalogRepository';
import { repositoryOperation, type RepositoryResult } from './repositoryResult';
import { getSupabaseClient } from './supabase';

export type SaveProgramInput = {
  name: string;
  description: string;
  productKey?: string;
  setup: ProgramSetup;
  rows: ProgramScheduleRow[];
};

export type SavedProgramDraft = {
  programId: string;
  versionId: string;
  versionNumber: number;
};

export async function saveProgramDraft(input: SaveProgramInput): Promise<RepositoryResult<SavedProgramDraft>> {
  return repositoryOperation('Save program draft', async () => {
    const client = getSupabaseClient();
    const { userId } = await assertProgramStaff(client);

    const { data: program, error: programError } = await client.from('programs').insert({
      name: input.name.trim(),
      description: input.description.trim(),
      product_key: input.productKey?.trim() || null,
      created_by: userId,
    }).select('id').single();
    if (programError) throw programError;

    const { data: version, error: versionError } = await client.from('program_versions').insert({
      program_id: program.id,
      version_number: 1,
      duration_weeks: input.setup.durationWeeks,
      training_days_per_week: input.setup.trainingDaysPerWeek,
      progression_method: input.setup.progressionMethod,
      progression_value: input.setup.progressionValue,
      effort_conversion_method: input.setup.progressionMethod === 'RPE' || input.setup.progressionMethod === 'RIR'
        ? 'helms-rpe-rir-estimate-v1'
        : null,
      created_by: userId,
    }).select('id').single();
    if (versionError) {
      await client.from('programs').delete().eq('id', program.id);
      throw versionError;
    }

    const scheduleRows = input.rows.map((row) => ({
      program_version_id: version.id,
      exercise_id: row.exerciseId,
      week_number: row.weekNumber,
      day_number: row.dayNumber,
      exercise_order: row.exerciseOrder,
      progression_method: row.progressionMethod,
      progression_value: row.progressionValue,
      sets: row.sets,
      reps: row.reps,
      prescribed_percent: row.progressionMethod === '%1RM' && row.weekNumber > 1
        ? row.progressionValue
        : null,
    }));
    const { error: rowsError } = await client.from('program_schedule_rows').insert(scheduleRows);
    if (rowsError) {
      await client.from('programs').delete().eq('id', program.id);
      throw rowsError;
    }
    return { programId: program.id, versionId: version.id, versionNumber: 1 };
  });
}

export async function publishProgramVersion(versionId: string): Promise<RepositoryResult<void>> {
  return repositoryOperation('Publish program version', async () => {
    const client = getSupabaseClient();
    await assertProgramStaff(client);
    const { error } = await client.rpc('publish_program_version', { p_version_id: versionId });
    if (error) throw error;
  });
}
