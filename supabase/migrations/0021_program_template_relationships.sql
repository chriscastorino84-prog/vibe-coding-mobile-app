alter table public.program_versions
  add column if not exists max_exercises_per_workout integer
    check (max_exercises_per_workout between 1 and 100),
  add column if not exists max_sets_per_exercise integer
    check (max_sets_per_exercise between 1 and 50),
  add column if not exists max_reps_per_set integer
    check (max_reps_per_set between 1 and 1000),
  add column if not exists warmup_enabled boolean not null default false,
  add column if not exists cooldown_enabled boolean not null default false,
  add column if not exists discovery_enabled boolean not null default false,
  add column if not exists strength_formula_version text not null default 'lander-v1';

create table if not exists public.program_subworkouts (
  id uuid primary key default gen_random_uuid(),
  parent_program_version_id uuid not null
    references public.program_versions(id) on delete restrict,
  child_program_version_id uuid not null
    references public.program_versions(id) on delete restrict,
  relationship_type text not null
    check (relationship_type in ('warmup', 'cooldown', 'discovery')),
  launch_position text not null
    check (launch_position in ('before_workout', 'after_workout', 'program_setup')),
  required boolean not null default false,
  return_behavior text not null
    check (return_behavior in (
      'return_to_parent_workout',
      'return_to_parent_completion',
      'return_to_parent_program'
    )),
  display_label text not null check (length(btrim(display_label)) between 1 and 160),
  created_at timestamptz not null default now(),
  unique (parent_program_version_id, relationship_type),
  check (parent_program_version_id <> child_program_version_id)
);

create index if not exists program_subworkouts_parent_idx
  on public.program_subworkouts(parent_program_version_id);

create index if not exists program_subworkouts_child_idx
  on public.program_subworkouts(child_program_version_id);

create table if not exists public.program_enrollment_subworkouts (
  enrollment_id uuid not null references public.program_enrollments(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('warmup', 'cooldown', 'discovery')),
  child_program_version_id uuid not null
    references public.program_versions(id) on delete restrict,
  required boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (enrollment_id, relationship_type)
);

create index if not exists enrollment_subworkouts_child_idx
  on public.program_enrollment_subworkouts(child_program_version_id);

create or replace function public.pin_program_subworkouts_on_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.program_enrollment_subworkouts (
    enrollment_id, relationship_type, child_program_version_id, required
  )
  select new.id, relationship_type, child_program_version_id, required
  from public.program_subworkouts
  where parent_program_version_id = new.program_version_id;
  return new;
end;
$$;

drop trigger if exists pin_program_subworkouts_after_enrollment
  on public.program_enrollments;
create trigger pin_program_subworkouts_after_enrollment
  after insert on public.program_enrollments
  for each row execute function public.pin_program_subworkouts_on_enrollment();

create or replace function public.guard_subworkout_relationship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_status text;
  child_status text;
begin
  select status into parent_status
  from public.program_versions
  where id = new.parent_program_version_id;
  select status into child_status
  from public.program_versions
  where id = new.child_program_version_id;

  if parent_status is distinct from 'draft' then
    raise exception 'Sub-workout relationships can only be changed on draft parent versions.';
  end if;
  if child_status not in ('draft', 'published') then
    raise exception 'Sub-workout child version must be draft or published.';
  end if;
  return new;
end;
$$;

drop trigger if exists subworkout_relationships_only_editable_in_draft
  on public.program_subworkouts;
create trigger subworkout_relationships_only_editable_in_draft
  before insert or update on public.program_subworkouts
  for each row execute function public.guard_subworkout_relationship();

alter table public.program_subworkouts enable row level security;
alter table public.program_enrollment_subworkouts enable row level security;

create policy "users can read sub-workouts for published programs"
  on public.program_subworkouts for select to authenticated
  using (
    exists (
      select 1
      from public.program_versions
      where program_versions.id = program_subworkouts.parent_program_version_id
        and program_versions.status = 'published'
    )
    or (select public.is_program_staff())
  );

create policy "staff can manage sub-workouts on draft programs"
  on public.program_subworkouts for all to authenticated
  using (
    (select public.is_program_staff())
    and exists (
      select 1
      from public.program_versions
      where program_versions.id = program_subworkouts.parent_program_version_id
        and program_versions.status = 'draft'
    )
  )
  with check (
    (select public.is_program_staff())
    and exists (
      select 1
      from public.program_versions
      where program_versions.id = program_subworkouts.parent_program_version_id
        and program_versions.status = 'draft'
    )
  );

create policy "users can read their pinned sub-workouts"
  on public.program_enrollment_subworkouts for select to authenticated
  using (
    exists (
      select 1 from public.program_enrollments
      where program_enrollments.id = program_enrollment_subworkouts.enrollment_id
        and program_enrollments.user_id = (select auth.uid())
    )
    or (select public.is_program_staff())
  );

revoke all on public.program_subworkouts from anon;
grant select, insert, update, delete on public.program_subworkouts to authenticated;
revoke all on public.program_enrollment_subworkouts from anon;
grant select on public.program_enrollment_subworkouts to authenticated;

create or replace function public.publish_program_version(p_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program_id uuid;
  target_version_status text;
  relationship_count integer;
begin
  if not (select public.is_program_staff()) then
    raise exception 'Program staff permissions are required to publish a program.';
  end if;

  select program_id, status
  into target_program_id, target_version_status
  from public.program_versions
  where id = p_version_id
  for update;

  if target_program_id is null or target_version_status is distinct from 'draft' then
    raise exception 'The requested program draft does not exist or is not editable.';
  end if;

  select count(*) into relationship_count
  from public.program_subworkouts
  where parent_program_version_id = p_version_id;

  if (select warmup_enabled or cooldown_enabled or discovery_enabled
      from public.program_versions where id = p_version_id)
     and relationship_count = 0 then
    raise exception 'Enabled sub-workouts require at least one anchored relationship.';
  end if;

  if exists (
    select 1
    from public.program_subworkouts relationship
    join public.program_versions child
      on child.id = relationship.child_program_version_id
    where relationship.parent_program_version_id = p_version_id
      and child.status <> 'published'
  ) then
    raise exception 'Published programs may only reference published sub-workout versions.';
  end if;

  update public.program_versions
  set status = 'superseded'
  where program_id = target_program_id and status = 'published';

  update public.program_versions
  set status = 'published', published_at = now()
  where id = p_version_id;

  update public.programs
  set status = 'published', updated_at = now()
  where id = target_program_id;

  return p_version_id;
end;
$$;

revoke all on function public.publish_program_version(uuid) from public;
grant execute on function public.publish_program_version(uuid) to authenticated;
