alter table public.exercises
  add column if not exists instructions text;

drop index if exists public.exercises_search_idx;

create index if not exists exercises_search_idx
  on public.exercises using gin (
    to_tsvector(
      'simple',
      display_name || ' ' || coalesce(description, '') || ' ' || coalesce(instructions, '')
    )
  );
