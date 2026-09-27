create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_program_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (user_id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_user_profile();

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 160),
  normalized_name text not null,
  description text,
  category text,
  primary_muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  movement_pattern text,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create index if not exists exercises_search_idx
  on public.exercises using gin (to_tsvector('simple', display_name || ' ' || coalesce(description, '')));

create table if not exists public.exercise_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_revision text not null,
  license_review_status text not null check (license_review_status in ('pending', 'approved', 'rejected')),
  status text not null default 'pending' check (status in ('pending', 'importing', 'review_required', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_imported integer not null default 0 check (records_imported >= 0),
  duplicate_candidates integer not null default 0 check (duplicate_candidates >= 0),
  records_rejected integer not null default 0 check (records_rejected >= 0),
  error_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_name, source_revision)
);

create table if not exists public.exercise_sources (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  source_name text not null,
  source_record_id text not null,
  source_record_url text,
  source_revision text not null,
  import_batch_id uuid not null references public.exercise_import_batches(id) on delete restrict,
  license_name text not null,
  license_url text,
  license_notice text,
  attribution_text text,
  imported_at timestamptz not null default now(),
  unique (source_name, source_record_id, source_revision)
);

create table if not exists public.exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  alias text not null check (length(btrim(alias)) between 1 and 160),
  normalized_alias text not null,
  source_id uuid references public.exercise_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exercise_id, normalized_alias)
);

create index if not exists exercise_aliases_normalized_idx on public.exercise_aliases(normalized_alias);

create table if not exists public.exercise_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.exercise_import_batches(id) on delete restrict,
  candidate_source_record_id text not null,
  matched_exercise_id uuid references public.exercises(id) on delete restrict,
  similarity_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(similarity_reasons) = 'array'),
  review_status text not null default 'pending' check (review_status in ('pending', 'same_exercise', 'alias', 'distinct', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create index if not exists exercise_duplicate_candidates_review_idx
  on public.exercise_duplicate_candidates(import_batch_id, review_status);

create or replace function public.is_program_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = (select auth.uid()) and is_program_staff
  );
$$;

revoke all on function public.is_program_staff() from public;
grant execute on function public.is_program_staff() to authenticated;
