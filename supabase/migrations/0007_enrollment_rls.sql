alter table public.program_enrollments enable row level security;
alter table public.strength_estimates enable row level security;

create policy "users can read own program enrollments"
  on public.program_enrollments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_program_staff()));

create policy "users can create own program enrollments"
  on public.program_enrollments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.program_versions
      where program_versions.id = program_enrollments.program_version_id
        and program_versions.status = 'published'
    )
  );

create policy "users can update own program enrollments"
  on public.program_enrollments for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_program_staff()))
  with check (user_id = (select auth.uid()) or (select public.is_program_staff()));

create policy "users can read own strength estimates"
  on public.strength_estimates for select to authenticated
  using (
    exists (
      select 1 from public.program_enrollments
      where program_enrollments.id = strength_estimates.enrollment_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  );

create policy "users can manage own strength estimates"
  on public.strength_estimates for all to authenticated
  using (
    exists (
      select 1 from public.program_enrollments
      where program_enrollments.id = strength_estimates.enrollment_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  )
  with check (
    exists (
      select 1 from public.program_enrollments
      where program_enrollments.id = strength_estimates.enrollment_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  );

revoke all on public.program_enrollments, public.strength_estimates from anon;
grant select, insert, update on public.program_enrollments to authenticated;
grant select, insert on public.strength_estimates to authenticated;
