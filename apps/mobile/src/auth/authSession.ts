import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../services/supabase';

export {
  sendPasswordReset,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  subscribeToAuthChanges,
  signOut,
} from './authClient';

export async function restoreAuthSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session;
}
