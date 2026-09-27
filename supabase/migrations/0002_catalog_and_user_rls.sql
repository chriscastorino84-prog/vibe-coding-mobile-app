alter table public.user_profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_import_batches enable row level security;
alter table public.exercise_sources enable row level security;
alter table public.exercise_aliases enable row level security;
alter table public.exercise_duplicate_candidates enable row level security;

create policy "users can read their own profile"
  on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "staff can manage profiles and staff roles"
  on public.user_profiles for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

create policy "authenticated users can read active exercises"
  on public.exercises for select to authenticated
  using (status = 'active' or (select public.is_program_staff()));

create policy "staff can manage exercises"
  on public.exercises for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

create policy "staff can read and manage exercise imports"
  on public.exercise_import_batches for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

create policy "authenticated users can read source details for active exercises"
  on public.exercise_sources for select to authenticated
  using (
    exists (
      select 1 from public.exercises
      where exercises.id = exercise_sources.exercise_id and exercises.status = 'active'
    )
    or (select public.is_program_staff())
  );

create policy "staff can manage exercise sources"
  on public.exercise_sources for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

create policy "authenticated users can read aliases for active exercises"
  on public.exercise_aliases for select to authenticated
  using (
    exists (
      select 1 from public.exercises
      where exercises.id = exercise_aliases.exercise_id and exercises.status = 'active'
    )
    or (select public.is_program_staff())
  );

create policy "staff can manage exercise aliases"
  on public.exercise_aliases for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

create policy "staff can manage duplicate candidates"
  on public.exercise_duplicate_candidates for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

revoke all on public.user_profiles, public.exercises, public.exercise_import_batches,
  public.exercise_sources, public.exercise_aliases, public.exercise_duplicate_candidates from anon;
grant select on public.exercises, public.exercise_sources, public.exercise_aliases to authenticated;
grant select, insert, update, delete on public.exercises, public.exercise_import_batches,
  public.exercise_sources, public.exercise_aliases, public.exercise_duplicate_candidates to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
