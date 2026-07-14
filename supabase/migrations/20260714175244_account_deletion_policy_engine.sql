alter table public.account_deletion_requests drop constraint if exists account_deletion_requests_status_check;
update public.account_deletion_requests set status = 'COOLING_OFF' where status = 'REQUESTED';
alter table public.account_deletion_requests
  add column if not exists canceled_at timestamptz,
  add column if not exists blocked_reason_code text,
  add constraint account_deletion_requests_status_check check (status in ('REQUESTED','COOLING_OFF','CLAIMED','PROCESSING','COMPLETED','FAILED','CANCELED','BLOCKED_PENDING_REVIEW'));

drop index if exists public.account_deletion_requests_one_active_per_user;
create unique index account_deletion_requests_one_active_per_user
  on public.account_deletion_requests(user_id)
  where status in ('REQUESTED','COOLING_OFF','CLAIMED','PROCESSING','BLOCKED_PENDING_REVIEW');

create or replace function public.claim_due_account_deletions(p_limit integer, p_policy_version text)
returns table (id uuid, user_id uuid)
language sql
security invoker
set search_path = pg_catalog, public
as $$
  with due as (
    select request.id from public.account_deletion_requests request
    where request.status in ('REQUESTED','COOLING_OFF') and request.scheduled_for <= now() and request.user_id is not null
    order by request.scheduled_for limit least(greatest(p_limit, 1), 100) for update skip locked
  )
  update public.account_deletion_requests request
  set status = 'CLAIMED', processing_started_at = now(), policy_version = p_policy_version, failure_code = null, updated_at = now()
  from due where request.id = due.id returning request.id, request.user_id;
$$;

revoke all on function public.claim_due_account_deletions(integer, text) from public, anon, authenticated;
grant execute on function public.claim_due_account_deletions(integer, text) to service_role;
