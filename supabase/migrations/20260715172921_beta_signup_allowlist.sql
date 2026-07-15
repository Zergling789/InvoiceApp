create table if not exists public.beta_signup_allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid,
  created_at timestamptz not null default now(),
  constraint beta_signup_allowlist_email_check check (
    email = lower(btrim(email))
    and length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  constraint beta_signup_allowlist_expiry_check check (expires_at > created_at),
  constraint beta_signup_allowlist_consumption_check check (
    (consumed_at is null and consumed_by is null)
    or (consumed_at is not null and consumed_by is not null)
  )
);

create unique index if not exists beta_signup_allowlist_email_key
  on public.beta_signup_allowlist (lower(email));

alter table public.beta_signup_allowlist enable row level security;

drop policy if exists beta_signup_allowlist_auth_hook_access on public.beta_signup_allowlist;
create policy beta_signup_allowlist_auth_hook_access
  on public.beta_signup_allowlist
  for all
  to supabase_auth_admin
  using (true)
  with check (true);

revoke all on table public.beta_signup_allowlist from public, anon, authenticated;
grant select, update on table public.beta_signup_allowlist to supabase_auth_admin;

create or replace function public.hook_require_beta_signup_invite(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  requested_email text := lower(btrim(event -> 'user' ->> 'email'));
  requested_user_id uuid;
  consumed_invite_id uuid;
begin
  begin
    requested_user_id := (event -> 'user' ->> 'id')::uuid;
  exception when invalid_text_representation then
    requested_user_id := null;
  end;

  if requested_email is null or requested_email = '' or requested_user_id is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'BETA_INVITE_REQUIRED'
      )
    );
  end if;

  update public.beta_signup_allowlist
  set consumed_at = now(), consumed_by = requested_user_id
  where lower(email) = requested_email
    and consumed_at is null
    and expires_at > now()
  returning id into consumed_invite_id;

  if consumed_invite_id is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'BETA_INVITE_REQUIRED'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

revoke all on function public.hook_require_beta_signup_invite(jsonb) from public, anon, authenticated;
grant execute on function public.hook_require_beta_signup_invite(jsonb) to supabase_auth_admin;

comment on table public.beta_signup_allowlist is
  'Server-only, expiring and single-use email allowlist for the closed beta signup hook.';
comment on function public.hook_require_beta_signup_invite(jsonb) is
  'Supabase Before User Created hook. Configure as pg-functions://postgres/public/hook_require_beta_signup_invite.';
