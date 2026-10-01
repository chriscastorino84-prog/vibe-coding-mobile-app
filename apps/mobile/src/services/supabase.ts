import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

let client: SupabaseClient | undefined;

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !anonKey) {
    throw new SupabaseConfigurationError(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/mobile/.env.',
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      storage: typeof window === 'undefined' ? undefined : AsyncStorage,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function resetSupabaseClientForTests(): void {
  client = undefined;
}
