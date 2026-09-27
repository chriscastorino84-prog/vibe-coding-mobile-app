create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  product_key text unique,
  name text not null check (length(btrim(name)) between 1 and 160),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'superseded')),
  duration_weeks integer not null check (duration_weeks between 1 and 52),
  training_days_per_week integer not null check (training_days_per_week between 1 and 7),
  progression_method text not null check (progression_method in ('%1RM', 'RPE', 'RIR', 'STD')),
  progression_value numeric,
  strength_formula text not null default 'lander-v1',
  effort_conversion_method text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (program_id, version_number),
  check (
    progression_method = 'STD'
    or (progression_method = '%1RM' and progression_value > 0 and progression_value <= 100)
    or (progression_method in ('RPE', 'RIR') and progression_value >= 0 and progression_value <= 10)
  )
);

create unique index if not exists one_published_program_version
  on public.program_versions(program_id) where status = 'published';

create table if not exists public.program_schedule_rows (
  id uuid primary key default gen_random_uuid(),
  program_version_id uuid not null references public.program_versions(id) on delete restrict,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  week_number integer not null check (week_number > 0),
  day_number integer not null check (day_number > 0),
  exercise_order integer not null check (exercise_order >= 0),
  progression_method text check (progression_method in ('%1RM', 'RPE', 'RIR', 'STD')),
  progression_value numeric,
  sets integer not null check (sets between 1 and 20),
  reps integer not null check (reps between 1 and 100),
  prescribed_percent numeric check (prescribed_percent > 0 and prescribed_percent <= 100),
  rest_seconds integer check (rest_seconds > 0),
  set_label text,
  focus text,
  created_at timestamptz not null default now(),
  unique (program_version_id, week_number, day_number, exercise_order),
  check (
    progression_value is null
    or progression_method is null
    or progression_method = 'STD'
    or (progression_method = '%1RM' and progression_value > 0 and progression_value <= 100)
    or (progression_method in ('RPE', 'RIR') and progression_value >= 0 and progression_value <= 10)
    or progression_method = 'STD'
  )
);

create index if not exists program_schedule_rows_version_idx
  on public.program_schedule_rows(program_version_id, week_number, day_number, exercise_order);

create or replace function public.guard_program_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_status text;
begin
  if tg_table_name = 'program_versions' then
    if tg_op = 'DELETE' then
      if old.status in ('published', 'superseded') then
        raise exception 'Published program versions are immutable; create a new draft version.';
      end if;
      return old;
    end if;
    if old.status in ('published', 'superseded') then
      if old.status = 'published'
        and new.status = 'superseded'
        and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
        return new;
      end if;
      raise exception 'Published program versions are immutable; create a new draft version.';
    end if;
    return new;
  end if;

  select status into version_status
  from public.program_versions
  where id = coalesce(new.program_version_id, old.program_version_id);
  if version_status is distinct from 'draft' then
    raise exception 'Schedule rows can only be changed while their program version is a draft.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger program_versions_are_immutable
  before update or delete on public.program_versions
  for each row execute function public.guard_program_version_mutation();

create trigger schedule_rows_only_editable_in_draft
  before insert or update or delete on public.program_schedule_rows
  for each row execute function public.guard_program_version_mutation();
