create table if not exists public.deletion_audit (
  deletion_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'requested'
    check (status in ('requested', 'completed', 'failed'))
);

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null,
  status text not null check (status in ('active', 'expired', 'revoked')),
  source text not null default 'system',
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, entitlement_key)
);

alter table public.deletion_audit enable row level security;
alter table public.entitlements enable row level security;

create policy "users can read own deletion audit"
  on public.deletion_audit for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users can read own entitlements"
  on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.deletion_audit, public.entitlements from anon;
grant select on public.deletion_audit, public.entitlements to authenticated;
