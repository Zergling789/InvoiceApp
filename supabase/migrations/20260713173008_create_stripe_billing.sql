create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete restrict,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete restrict,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_key text not null default 'BASIS',
  status text not null default 'INACTIVE',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_plan_check check (plan_key in ('BASIS', 'SOLO', 'PRO')),
  constraint billing_subscriptions_status_check check (status in ('INACTIVE','TRIALING','ACTIVE','PAST_DUE','UNPAID','PAUSED','CANCELED','INCOMPLETE','INCOMPLETE_EXPIRED'))
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'PROCESSING',
  attempts integer not null default 1,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error_code text,
  constraint stripe_webhook_events_status_check check (status in ('PROCESSING','PROCESSED','FAILED'))
);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists billing_subscriptions_select_own on public.billing_subscriptions;
create policy billing_subscriptions_select_own on public.billing_subscriptions for select to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.billing_customers, public.billing_subscriptions, public.stripe_webhook_events from anon, authenticated;
grant select on table public.billing_subscriptions to authenticated;

create or replace function public.claim_stripe_webhook(p_event_id text, p_event_type text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare affected_rows integer := 0;
begin
  insert into public.stripe_webhook_events(event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (event_id) do update set
    status = 'PROCESSING', attempts = stripe_webhook_events.attempts + 1,
    last_error_code = null
  where stripe_webhook_events.status = 'FAILED';
  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.claim_stripe_webhook(text, text) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook(text, text) to service_role;
