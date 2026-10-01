create table if not exists public.user_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  wellness_disclaimer_version text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists public.sync_operations (
  operation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (length(btrim(entity_type)) between 1 and 80),
  entity_id text not null check (length(btrim(entity_id)) between 1 and 160),
  operation_type text not null check (operation_type in ('create', 'update', 'delete')),
  payload jsonb not null,
  created_at timestamptz not null,
  applied_at timestamptz,
  unique (user_id, operation_id)
);

create index if not exists sync_operations_user_created_idx
  on public.sync_operations(user_id, created_at);

alter table public.user_consents enable row level security;
alter table public.sync_operations enable row level security;

create policy "users can manage own consent"
  on public.user_consents for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users can submit own sync operations"
  on public.sync_operations for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users can read own sync operations"
  on public.sync_operations for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.user_consents, public.sync_operations from anon;
grant select, insert, update, delete on public.user_consents to authenticated;
grant select, insert on public.sync_operations to authenticated;
