revoke all on table public.beta_signup_allowlist from service_role;
grant select, insert, delete on table public.beta_signup_allowlist to service_role;

comment on table public.beta_signup_allowlist is
  'Server-only, expiring and single-use email allowlist. service_role may manage invitations; the auth hook consumes them.';
