alter table public.account_deletion_requests
  alter column user_id drop not null,
  add column if not exists policy_version text,
  add column if not exists processing_started_at timestamptz,
  add column if not exists failure_code text;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_user_id_fkey;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

create or replace function public.claim_due_account_deletions(
  p_limit integer,
  p_policy_version text
)
returns table (id uuid, user_id uuid)
language sql
security invoker
set search_path = public
as $$
  with due as (
    select request.id
    from public.account_deletion_requests request
    where request.status = 'REQUESTED'
      and request.scheduled_for <= now()
      and request.user_id is not null
    order by request.scheduled_for
    limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  update public.account_deletion_requests request
  set status = 'PROCESSING',
      processing_started_at = now(),
      policy_version = p_policy_version,
      failure_code = null,
      updated_at = now()
  from due
  where request.id = due.id
  returning request.id, request.user_id;
$$;

revoke all on function public.claim_due_account_deletions(integer, text)
  from public, anon, authenticated;
grant execute on function public.claim_due_account_deletions(integer, text)
  to service_role;

comment on function public.claim_due_account_deletions(integer, text) is
  'Atomically claims due account deletion requests. Server service role only.';
