create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'REQUESTED',
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default (now() + interval '7 days'),
  completed_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_requests_status_check
    check (status in ('REQUESTED', 'PROCESSING', 'COMPLETED', 'CANCELED', 'FAILED')),
  constraint account_deletion_requests_completion_check
    check ((status = 'COMPLETED' and completed_at is not null) or status <> 'COMPLETED')
);

create unique index if not exists account_deletion_requests_one_active_per_user
  on public.account_deletion_requests (user_id)
  where status in ('REQUESTED', 'PROCESSING');

create index if not exists account_deletion_requests_schedule_idx
  on public.account_deletion_requests (scheduled_for)
  where status = 'REQUESTED';

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own
  on public.account_deletion_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.account_deletion_requests from anon, authenticated;
grant select on table public.account_deletion_requests to authenticated;

comment on table public.account_deletion_requests is
  'Controlled account deletion workflow. Creation and processing are server-only; users may read their own status.';
