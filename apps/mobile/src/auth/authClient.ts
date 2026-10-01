import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '../services/supabase';

export function signUpWithEmail(email: string, password: string) {
  return getSupabaseClient().auth.signUp({ email: email.trim(), password });
}

export function signInWithEmail(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
}

export function sendPasswordReset(email: string) {
  return getSupabaseClient().auth.resetPasswordForEmail(email.trim());
}

export function signOut() {
  return getSupabaseClient().auth.signOut();
}

export function signInWithProvider(provider: 'apple' | 'google') {
  return getSupabaseClient().auth.signInWithOAuth({ provider });
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = getSupabaseClient().auth.onAuthStateChange(callback);
  return data.subscription;
}
