alter table public.billing_subscriptions
  add column if not exists last_event_created_at timestamptz,
  add column if not exists payment_failed_at timestamptz;

alter table public.stripe_webhook_events
  add column if not exists event_created_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.billing_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  period_start date not null,
  period_end date not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, metric, period_start),
  constraint billing_usage_period_check check (period_end > period_start)
);

alter table public.billing_usage enable row level security;
revoke all on table public.billing_usage from public, anon, authenticated;

create or replace function public.increment_billing_usage(
  p_user_id uuid,
  p_metric text,
  p_period_start date,
  p_period_end date,
  p_limit integer
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  next_quantity integer;
begin
  if p_limit < 1 or p_period_end <= p_period_start or length(trim(p_metric)) = 0 then
    raise exception 'BILLING_USAGE_INVALID';
  end if;
  insert into public.billing_usage(user_id, metric, period_start, period_end, quantity)
  values (p_user_id, p_metric, p_period_start, p_period_end, 1)
  on conflict (user_id, metric, period_start) do update
    set quantity = public.billing_usage.quantity + 1,
        period_end = excluded.period_end,
        updated_at = now()
    where public.billing_usage.quantity < p_limit
  returning quantity into next_quantity;
  if next_quantity is null then raise exception 'USAGE_LIMIT_REACHED'; end if;
  return next_quantity;
end;
$$;

revoke all on function public.increment_billing_usage(uuid, text, date, date, integer) from public, anon, authenticated;
grant execute on function public.increment_billing_usage(uuid, text, date, date, integer) to service_role;

create or replace function public.claim_stripe_webhook(p_event_id text, p_event_type text, p_event_created_at timestamptz)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare affected_rows integer := 0;
begin
  insert into public.stripe_webhook_events(event_id, event_type, event_created_at)
  values (p_event_id, p_event_type, p_event_created_at)
  on conflict (event_id) do update set
    status = 'PROCESSING', attempts = stripe_webhook_events.attempts + 1,
    last_error_code = null, updated_at = now()
  where stripe_webhook_events.status = 'FAILED';
  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.claim_stripe_webhook(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook(text, text, timestamptz) to service_role;
