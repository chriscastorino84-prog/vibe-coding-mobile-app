create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.program_enrollments(id) on delete cascade,
  scheduled_week integer not null check (scheduled_week > 0),
  scheduled_day integer not null check (scheduled_day > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

create index if not exists workouts_enrollment_schedule_idx
  on public.workouts(enrollment_id, scheduled_week, scheduled_day, started_at desc);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  program_schedule_row_id uuid not null references public.program_schedule_rows(id) on delete restrict,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  exercise_order integer not null check (exercise_order >= 0),
  flag_polarity text check (flag_polarity in ('positive', 'negative', 'mixed')),
  created_at timestamptz not null default now(),
  unique (workout_id, exercise_order)
);

create table if not exists public.workout_set_results (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null check (set_number > 0),
  prescribed_load numeric check (prescribed_load >= 0),
  prescribed_reps integer not null check (prescribed_reps between 0 and 100),
  prescribed_effort numeric check (prescribed_effort between 0 and 10),
  actual_load numeric check (actual_load >= 0),
  completed_reps integer not null check (completed_reps between 0 and 100),
  actual_effort_value numeric check (actual_effort_value between 0 and 10),
  actual_effort_scale text check (actual_effort_scale in ('RPE', 'RIR')),
  is_discovery_set boolean not null default false,
  tonnage_prescribed numeric not null default 0 check (tonnage_prescribed >= 0),
  tonnage_performed numeric not null default 0 check (tonnage_performed >= 0),
  mismatch_reasons text[] not null default '{}',
  flag_polarity text check (flag_polarity in ('positive', 'negative')),
  recorded_at timestamptz not null default now(),
  unique (workout_exercise_id, set_number),
  check (
    (actual_effort_value is null and actual_effort_scale is null)
    or (actual_effort_value is not null and actual_effort_scale is not null)
  )
);

create index if not exists workout_set_results_exercise_idx
  on public.workout_set_results(workout_exercise_id, set_number);

create table if not exists public.user_program_adjustments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.program_enrollments(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  trigger_workout_id uuid not null references public.workouts(id) on delete restrict,
  trigger_set_result_id uuid not null references public.workout_set_results(id) on delete restrict,
  polarity text not null check (polarity in ('positive', 'negative')),
  previous_estimated_1rm numeric not null check (previous_estimated_1rm > 0),
  new_estimated_1rm numeric not null check (new_estimated_1rm > 0),
  effective_from_week integer not null check (effective_from_week > 0),
  effective_from_day integer not null check (effective_from_day > 0),
  calculation_method_version text not null,
  created_at timestamptz not null default now(),
  unique (enrollment_id, trigger_set_result_id)
);

create index if not exists user_program_adjustments_enrollment_exercise_idx
  on public.user_program_adjustments(enrollment_id, exercise_id, created_at);

alter table public.strength_estimates
  add constraint strength_estimates_source_workout_fk
  foreign key (source_workout_id) references public.workouts(id) on delete set null;

alter table public.strength_estimates
  add constraint strength_estimates_source_set_fk
  foreign key (source_set_result_id) references public.workout_set_results(id) on delete set null;
