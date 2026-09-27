alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_set_results enable row level security;
alter table public.user_program_adjustments enable row level security;

create policy "users can read and manage own workouts"
  on public.workouts for all to authenticated
  using (
    exists (
      select 1 from public.program_enrollments
      where program_enrollments.id = workouts.enrollment_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  )
  with check (
    exists (
      select 1 from public.program_enrollments
      where program_enrollments.id = workouts.enrollment_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  );

create policy "users can read and manage own workout exercises"
  on public.workout_exercises for all to authenticated
  using (
    exists (
      select 1 from public.workouts
      join public.program_enrollments on program_enrollments.id = workouts.enrollment_id
      where workouts.id = workout_exercises.workout_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  )
  with check (
    exists (
      select 1 from public.workouts
      join public.program_enrollments on program_enrollments.id = workouts.enrollment_id
      where workouts.id = workout_exercises.workout_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  );

create policy "users can read and manage own set results"
  on public.workout_set_results for all to authenticated
  using (
    exists (
      select 1 from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      join public.program_enrollments on program_enrollments.id = workouts.enrollment_id
      where workout_exercises.id = workout_set_results.workout_exercise_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  )
  with check (
    exists (
      select 1 from public.workout_exercises
      join public.workouts on workouts.id = workout_exercises.workout_id
      join public.program_enrollments on program_enrollments.id = workouts.enrollment_id
      where workout_exercises.id = workout_set_results.workout_exercise_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  );

create policy "users can read own adjustment history"
  on public.user_program_adjustments for select to authenticated
  using (
    exists (
      select 1 from public.program_enrollments
      where program_enrollments.id = user_program_adjustments.enrollment_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  );

create policy "staff can create adjustment history"
  on public.user_program_adjustments for insert to authenticated
  with check ((select public.is_program_staff()));

revoke all on public.workouts, public.workout_exercises, public.workout_set_results,
  public.user_program_adjustments from anon;
grant select, insert, update, delete on public.workouts, public.workout_exercises,
  public.workout_set_results to authenticated;
grant select, insert on public.user_program_adjustments to authenticated;
