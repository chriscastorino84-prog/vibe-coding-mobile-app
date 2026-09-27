create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_version_id uuid not null references public.program_versions(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  discovery_status text not null default 'not_started' check (discovery_status in ('not_started', 'in_progress', 'complete')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, program_version_id)
);

create index if not exists program_enrollments_user_idx on public.program_enrollments(user_id, status);

create table if not exists public.strength_estimates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.program_enrollments(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  source_workout_id uuid,
  source_set_result_id uuid,
  estimated_1rm numeric not null check (estimated_1rm > 0),
  load numeric not null check (load > 0),
  reps_input integer not null check (reps_input between 1 and 10),
  effort_input numeric check (effort_input between 0 and 10),
  method text not null check (method in ('lander-v1', 'rpe-rir-table-v1')),
  method_version text not null,
  estimate_label text not null default 'approximate',
  created_at timestamptz not null default now()
);

create index if not exists strength_estimates_enrollment_exercise_idx
  on public.strength_estimates(enrollment_id, exercise_id, created_at desc);

alter table public.strength_estimates
  add constraint strength_estimates_effort_method_check
  check (
    (method = 'lander-v1' and effort_input is null)
    or (method = 'rpe-rir-table-v1' and effort_input between 0 and 10)
  );
