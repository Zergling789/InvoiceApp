alter table public.user_settings
  add column if not exists onboarding_step text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_client_id uuid;

-- Accounts that existed before this migration have already worked with the app.
-- Mark them as complete so the new onboarding never interrupts existing users.
update public.user_settings
set onboarding_step = 'DONE',
    onboarding_completed_at = coalesce(onboarding_completed_at, updated_at, now())
where onboarding_step is null;

insert into public.user_settings (
  user_id,
  onboarding_step,
  onboarding_completed_at,
  updated_at
)
select
  users.id,
  'DONE',
  now(),
  now()
from auth.users as users
where not exists (
  select 1
  from public.user_settings as settings
  where settings.user_id = users.id
);

alter table public.user_settings
  alter column onboarding_step set default 'WELCOME',
  alter column onboarding_step set not null;

alter table public.user_settings
  drop constraint if exists user_settings_onboarding_step_check;

alter table public.user_settings
  add constraint user_settings_onboarding_step_check
  check (onboarding_step in ('WELCOME', 'COMPANY', 'TAX', 'CUSTOMER', 'OFFER', 'DONE'));

alter table public.user_settings
  drop constraint if exists user_settings_onboarding_completion_check;

alter table public.user_settings
  add constraint user_settings_onboarding_completion_check
  check (
    (onboarding_step = 'DONE' and onboarding_completed_at is not null)
    or
    (onboarding_step <> 'DONE' and onboarding_completed_at is null)
  );
