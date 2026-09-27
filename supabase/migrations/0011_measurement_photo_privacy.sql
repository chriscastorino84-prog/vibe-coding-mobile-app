alter table public.workout_body_measurements enable row level security;
alter table public.anthropometric_measurements enable row level security;
alter table public.progress_photos enable row level security;

create policy "users can manage own workout body measurements"
  on public.workout_body_measurements for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_program_staff()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workouts
      join public.program_enrollments on program_enrollments.id = workouts.enrollment_id
      where workouts.id = workout_body_measurements.workout_id
        and program_enrollments.user_id = (select auth.uid())
    )
  );

create policy "users can manage own anthropometric measurements"
  on public.anthropometric_measurements for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_program_staff()))
  with check (
    user_id = (select auth.uid())
    and (
      workout_id is null
      or exists (
        select 1 from public.workouts
        join public.program_enrollments on program_enrollments.id = workouts.enrollment_id
        where workouts.id = anthropometric_measurements.workout_id
          and program_enrollments.user_id = (select auth.uid())
      )
    )
  );

create policy "users can manage own private progress photos"
  on public.progress_photos for all to authenticated
  using (user_id = (select auth.uid()) or (select public.is_program_staff()))
  with check (
    user_id = (select auth.uid())
    and (sharing = 'private' or sharing = 'shared')
  );

insert into storage.buckets (id, name, public, file_size_limit)
values ('progress-photos', 'progress-photos', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "users can read their own progress photo objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users can upload their own progress photo objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users can update their own progress photo objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users can delete their own progress photo objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.delete_user_progress_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
  where bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = old.id::text;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted_progress_photos on auth.users;
create trigger on_auth_user_deleted_progress_photos
  before delete on auth.users
  for each row execute function public.delete_user_progress_photos();

revoke all on public.workout_body_measurements, public.anthropometric_measurements, public.progress_photos from anon;
grant select, insert, update, delete on public.workout_body_measurements,
  public.anthropometric_measurements, public.progress_photos to authenticated;
