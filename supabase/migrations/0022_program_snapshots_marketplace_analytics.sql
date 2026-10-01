alter table public.programs
  add column if not exists marketplace_status text not null default 'private'
    check (marketplace_status in ('private', 'published', 'retired')),
  add column if not exists access_tier text not null default 'free'
    check (access_tier in ('free', 'paid')),
  add column if not exists ad_policy text not null default 'none'
    check (ad_policy in ('none', 'free_programs_only'));

alter table public.program_versions
  add column if not exists analytics_config jsonb not null default
    '{"coachMetrics":[],"userMetrics":[],"leaderboardEnabled":false}'::jsonb;

create table if not exists public.program_analytics_definitions (
  id uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references public.program_versions(id) on delete restrict,
  metric_key text not null check (length(btrim(metric_key)) between 1 and 100),
  audience text not null check (audience in ('user', 'coach', 'both')),
  display_label text not null check (length(btrim(display_label)) between 1 and 160),
  unit text,
  aggregation text not null check (aggregation in ('sum', 'average', 'median', 'minimum', 'maximum', 'percentage')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (program_version_id, metric_key)
);

create index if not exists program_analytics_definitions_version_idx
  on public.program_analytics_definitions(program_version_id, enabled);

create table if not exists public.program_cycle_snapshots (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.program_enrollments(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_version_id uuid not null references public.program_versions(id) on delete restrict,
  completed_at timestamptz not null,
  dashboard_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(dashboard_config) = 'object')
);

create index if not exists program_cycle_snapshots_user_idx
  on public.program_cycle_snapshots(user_id, completed_at desc);

create index if not exists program_cycle_snapshots_program_idx
  on public.program_cycle_snapshots(program_version_id, completed_at desc);

create table if not exists public.program_cycle_snapshot_metrics (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.program_cycle_snapshots(id) on delete cascade,
  metric_key text not null check (length(btrim(metric_key)) between 1 and 100),
  numeric_value numeric,
  text_value text,
  unit text,
  recorded_at timestamptz not null default now(),
  check (numeric_value is not null or text_value is not null),
  unique (snapshot_id, metric_key)
);

create index if not exists program_cycle_snapshot_metrics_lookup_idx
  on public.program_cycle_snapshot_metrics(snapshot_id, metric_key);

create table if not exists public.program_aggregate_metrics (
  id uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references public.program_versions(id) on delete restrict,
  metric_key text not null check (length(btrim(metric_key)) between 1 and 100),
  aggregation_period_start date not null,
  aggregation_period_end date not null,
  participant_count integer not null check (participant_count >= 0),
  numeric_value numeric,
  percentage_value numeric check (percentage_value between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (
    program_version_id,
    metric_key,
    aggregation_period_start,
    aggregation_period_end
  ),
  check (numeric_value is not null or percentage_value is not null),
  check (aggregation_period_end >= aggregation_period_start)
);

create index if not exists program_aggregate_metrics_program_idx
  on public.program_aggregate_metrics(program_version_id, aggregation_period_end desc);

alter table public.program_analytics_definitions enable row level security;
alter table public.program_cycle_snapshots enable row level security;
alter table public.program_cycle_snapshot_metrics enable row level security;
alter table public.program_aggregate_metrics enable row level security;

create policy "users can read analytics definitions for published programs"
  on public.program_analytics_definitions for select to authenticated
  using (
    exists (
      select 1 from public.program_versions
      where program_versions.id = program_analytics_definitions.program_version_id
        and program_versions.status = 'published'
    )
    or (select public.is_program_staff())
  );

create policy "staff can manage analytics definitions on draft programs"
  on public.program_analytics_definitions for all to authenticated
  using (
    (select public.is_program_staff())
    and exists (
      select 1 from public.program_versions
      where program_versions.id = program_analytics_definitions.program_version_id
        and program_versions.status = 'draft'
    )
  )
  with check (
    (select public.is_program_staff())
    and exists (
      select 1 from public.program_versions
      where program_versions.id = program_analytics_definitions.program_version_id
        and program_versions.status = 'draft'
    )
  );

create policy "users can read own program snapshots"
  on public.program_cycle_snapshots for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users can read metrics from own program snapshots"
  on public.program_cycle_snapshot_metrics for select to authenticated
  using (
    exists (
      select 1 from public.program_cycle_snapshots
      where program_cycle_snapshots.id = program_cycle_snapshot_metrics.snapshot_id
        and program_cycle_snapshots.user_id = (select auth.uid())
    )
  );

create policy "coaches can read aggregate program analytics"
  on public.program_aggregate_metrics for select to authenticated
  using ((select public.is_program_staff()));

revoke all on public.program_analytics_definitions,
  public.program_cycle_snapshots,
  public.program_cycle_snapshot_metrics,
  public.program_aggregate_metrics from anon;
grant select on public.program_analytics_definitions,
  public.program_cycle_snapshots,
  public.program_cycle_snapshot_metrics,
  public.program_aggregate_metrics to authenticated;

create or replace function public.complete_program_enrollment(p_enrollment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  enrollment_row public.program_enrollments%rowtype;
  snapshot_id uuid;
  completed_at_value timestamptz := now();
  workout_count integer;
  completed_workout_count integer;
  set_count integer;
  total_tonnage numeric;
begin
  select *
  into enrollment_row
  from public.program_enrollments
  where id = p_enrollment_id
    and user_id = (select auth.uid())
  for update;

  if enrollment_row.id is null then
    raise exception 'The program enrollment does not belong to the signed-in user.';
  end if;
  if enrollment_row.status = 'completed' then
    select id into snapshot_id
    from public.program_cycle_snapshots
    where enrollment_id = p_enrollment_id;
    return snapshot_id;
  end if;

  select count(*), count(*) filter (where status = 'completed')
  into workout_count, completed_workout_count
  from public.workouts
  where enrollment_id = p_enrollment_id;

  select count(*), coalesce(sum(tonnage_performed), 0)
  into set_count, total_tonnage
  from public.workout_set_results
  where workout_exercise_id in (
    select workout_exercises.id
    from public.workout_exercises
    join public.workouts on workouts.id = workout_exercises.workout_id
    where workouts.enrollment_id = p_enrollment_id
  );

  update public.program_enrollments
  set status = 'completed', completed_at = completed_at_value
  where id = p_enrollment_id;

  insert into public.program_cycle_snapshots (
    enrollment_id, user_id, program_version_id, completed_at, dashboard_config
  )
  select
    p_enrollment_id,
    enrollment_row.user_id,
    enrollment_row.program_version_id,
    completed_at_value,
    coalesce(pv.analytics_config, '{}'::jsonb)
  from public.program_versions pv
  where pv.id = enrollment_row.program_version_id
  returning id into snapshot_id;

  insert into public.program_cycle_snapshot_metrics (
    snapshot_id, metric_key, numeric_value, unit
  )
  values
    (snapshot_id, 'workout_count', workout_count, 'workouts'),
    (snapshot_id, 'completed_workout_count', completed_workout_count, 'workouts'),
    (snapshot_id, 'set_count', set_count, 'sets'),
    (snapshot_id, 'total_tonnage', total_tonnage, 'load-units');

  insert into public.program_aggregate_metrics (
    program_version_id, metric_key, aggregation_period_start,
    aggregation_period_end, participant_count, numeric_value
  )
  values (
    enrollment_row.program_version_id,
    'total_tonnage',
    completed_at_value::date,
    completed_at_value::date,
    1,
    total_tonnage
  )
  on conflict (
    program_version_id, metric_key,
    aggregation_period_start, aggregation_period_end
  )
  do update set
    participant_count = public.program_aggregate_metrics.participant_count + 1,
    numeric_value = public.program_aggregate_metrics.numeric_value
      + excluded.numeric_value,
    updated_at = now();

  return snapshot_id;
end;
$$;

revoke all on function public.complete_program_enrollment(uuid) from public;
grant execute on function public.complete_program_enrollment(uuid) to authenticated;
