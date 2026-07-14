-- Compatibility bootstrap for fresh-project replays.
-- Production projects may already have this trigger helper; CREATE OR REPLACE
-- keeps their data and dependent triggers intact.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
