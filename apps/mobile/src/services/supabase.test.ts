import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSupabaseClient, resetSupabaseClientForTests, SupabaseConfigurationError } from './supabase';

describe('Supabase client configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetSupabaseClientForTests();
  });

  it('reports missing public configuration explicitly', () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(() => getSupabaseClient()).toThrowError(SupabaseConfigurationError);
  });

  it('creates a client when the public project URL and anon key are configured', () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');
    expect(getSupabaseClient()).toBeDefined();
  });
});
