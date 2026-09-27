import { getSupabaseClient } from './supabase';
import { repositoryOperation, type RepositoryResult } from './repositoryResult';
import { exerciseFromRow, type Exercise } from '../domain/types';

function normalizeSearchTerm(value: string): string {
  return value.trim().replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ');
}

export async function searchExercises(query: string): Promise<RepositoryResult<Exercise[]>> {
  return repositoryOperation('Search exercise catalog', async () => {
    const client = getSupabaseClient();
    const term = normalizeSearchTerm(query);
    if (!term) {
      const { data, error } = await client
        .from('exercises')
        .select('*')
        .eq('status', 'active')
        .order('display_name')
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => exerciseFromRow(row));
    }

    const pattern = `%${term}%`;
    const [{ data: directRows, error: directError }, { data: aliasRows, error: aliasError }] = await Promise.all([
      client.from('exercises').select('*').eq('status', 'active').ilike('display_name', pattern).limit(100),
      client.from('exercise_aliases').select('exercise_id').ilike('alias', pattern).limit(100),
    ]);
    if (directError) throw directError;
    if (aliasError) throw aliasError;

    const direct = directRows ?? [];
    const ids = [...new Set([
      ...direct.map((row) => String(row.id)),
      ...(aliasRows ?? []).map((row) => String(row.exercise_id)),
    ])];
    const remainingIds = ids.filter((id) => !direct.some((row) => String(row.id) === id));
    if (remainingIds.length === 0) return direct.map((row) => exerciseFromRow(row));

    const { data: aliasExercises, error } = await client
      .from('exercises')
      .select('*')
      .eq('status', 'active')
      .in('id', remainingIds);
    if (error) throw error;
    return [...direct, ...(aliasExercises ?? [])].map((row) => exerciseFromRow(row));
  });
}

export type ImportReviewSummary = {
  batches: Array<Record<string, unknown>>;
  candidates: Array<Record<string, unknown>>;
};

export async function loadImportReview(): Promise<RepositoryResult<ImportReviewSummary>> {
  return repositoryOperation('Load exercise import review', async () => {
    const client = getSupabaseClient();
    await assertProgramStaff(client);
    const [{ data: batches, error: batchError }, { data: candidates, error: candidateError }] = await Promise.all([
      client.from('exercise_import_batches').select('*').order('created_at', { ascending: false }).limit(50),
      client.from('exercise_duplicate_candidates').select('*').eq('review_status', 'pending').order('created_at').limit(200),
    ]);
    if (batchError) throw batchError;
    if (candidateError) throw candidateError;
    return { batches: batches ?? [], candidates: candidates ?? [] };
  });
}

export async function resolveDuplicateCandidate(
  candidateId: string,
  decision: 'same_exercise' | 'alias' | 'distinct' | 'rejected',
  note?: string,
): Promise<RepositoryResult<void>> {
  return repositoryOperation('Save duplicate review', async () => {
    const client = getSupabaseClient();
    await assertProgramStaff(client);
    const { error } = await client.from('exercise_duplicate_candidates')
      .update({ review_status: decision, decision_note: note ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', candidateId);
    if (error) throw error;
  });
}

export async function assertProgramStaff(
  client = getSupabaseClient(),
): Promise<{ userId: string }> {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign in with an authorized program-writer account to continue.');
  const { data, error } = await client.from('user_profiles')
    .select('is_program_staff')
    .eq('user_id', authData.user.id)
    .single();
  if (error) throw error;
  if (data?.is_program_staff !== true) throw new Error('This account is not authorized to write or publish programs.');
  return { userId: authData.user.id };
}
