create table if not exists public.workout_body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null unique references public.workouts(id) on delete cascade,
  bodyweight_value numeric not null check (bodyweight_value > 0),
  bodyweight_unit text not null check (bodyweight_unit in ('kg', 'lb')),
  body_composition_percent numeric not null check (body_composition_percent between 0 and 100),
  recorded_at timestamptz not null default now()
);

create index if not exists workout_body_measurements_user_idx
  on public.workout_body_measurements(user_id, recorded_at);

create table if not exists public.anthropometric_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete cascade,
  metric_key text not null check (length(btrim(metric_key)) between 1 and 80),
  value numeric not null check (value >= 0),
  unit text not null check (length(btrim(unit)) between 1 and 16),
  recorded_at timestamptz not null default now()
);

create index if not exists anthropometric_measurements_user_metric_idx
  on public.anthropometric_measurements(user_id, metric_key, recorded_at);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete cascade,
  storage_key text not null unique,
  sharing text not null default 'private' check (sharing in ('private', 'shared')),
  recorded_at timestamptz not null default now()
);

create index if not exists progress_photos_user_idx on public.progress_photos(user_id, recorded_at);
