alter table public.programs enable row level security;
alter table public.program_versions enable row level security;
alter table public.program_schedule_rows enable row level security;

create policy "users can read published programs"
  on public.programs for select to authenticated
  using (
    status = 'published'
    or (select public.is_program_staff())
  );

create policy "staff can manage programs"
  on public.programs for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

create policy "users can read published program versions"
  on public.program_versions for select to authenticated
  using (
    status = 'published'
    or (select public.is_program_staff())
  );

create policy "staff can manage program versions"
  on public.program_versions for all to authenticated
  using ((select public.is_program_staff()))
  with check ((select public.is_program_staff()));

create policy "users can read rows in published program versions"
  on public.program_schedule_rows for select to authenticated
  using (
    exists (
      select 1 from public.program_versions
      where program_versions.id = program_schedule_rows.program_version_id
        and program_versions.status = 'published'
    )
    or (select public.is_program_staff())
  );

create policy "staff can manage rows in draft versions"
  on public.program_schedule_rows for all to authenticated
  using (
    (select public.is_program_staff())
    and exists (
      select 1 from public.program_versions
      where program_versions.id = program_schedule_rows.program_version_id
        and program_versions.status = 'draft'
    )
  )
  with check (
    (select public.is_program_staff())
    and exists (
      select 1 from public.program_versions
      where program_versions.id = program_schedule_rows.program_version_id
        and program_versions.status = 'draft'
    )
  );

revoke all on public.programs, public.program_versions, public.program_schedule_rows from anon;
grant select on public.programs, public.program_versions, public.program_schedule_rows to authenticated;
grant insert, update, delete on public.programs, public.program_versions, public.program_schedule_rows to authenticated;

create or replace function public.validate_program_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  schedule_row_count integer;
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    select count(*) into schedule_row_count
    from public.program_schedule_rows
    where program_version_id = new.id;
    if schedule_row_count = 0 then
      raise exception 'A program version needs at least one exercise before publication.';
    end if;
    if exists (
      select 1 from public.program_schedule_rows
      where program_version_id = new.id
        and (week_number > new.duration_weeks or day_number > new.training_days_per_week)
    ) then
      raise exception 'Schedule rows exceed the program duration or training-day limits.';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_program_version_before_publish
  before update of status on public.program_versions
  for each row execute function public.validate_program_publication();

create or replace function public.publish_program_version(p_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program_id uuid;
begin
  if not (select public.is_program_staff()) then
    raise exception 'Program staff permissions are required to publish a program.';
  end if;

  select program_id into target_program_id
  from public.program_versions
  where id = p_version_id and status = 'draft'
  for update;
  if target_program_id is null then
    raise exception 'The requested program draft does not exist or is not editable.';
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
