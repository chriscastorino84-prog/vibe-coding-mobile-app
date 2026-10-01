import { getSupabaseClient } from '../../services/supabase';

export async function deleteCurrentAccount(): Promise<void> {
  const { error } = await getSupabaseClient().functions.invoke('delete-account', {
    body: { confirmation: 'DELETE_ACCOUNT' },
  });
  if (error) throw error;
  await getSupabaseClient().auth.signOut();
}
