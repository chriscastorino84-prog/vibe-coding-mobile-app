import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), '../../supabase/migrations/0002_catalog_and_user_rls.sql');

describe('catalog authorization migration contract', () => {
  const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

  it('enables RLS on imported catalog and provenance tables', () => {
    for (const table of ['exercises', 'exercise_import_batches', 'exercise_sources', 'exercise_aliases', 'exercise_duplicate_candidates']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('limits catalog mutations to program staff', () => {
    expect(sql).toContain('public.is_program_staff()');
    expect(sql).toContain('"staff can manage exercises"');
    expect(sql).toContain('"staff can manage exercise sources"');
    expect(sql).toContain('"staff can manage duplicate candidates"');
    expect(sql).toContain('from anon');
  });
});
