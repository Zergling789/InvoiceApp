create table if not exists public.email_send_idempotency (
  key text primary key,
  user_id uuid not null,
  status text not null default 'pending',
  response_json jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists email_send_idempotency_user_id_idx
  on public.email_send_idempotency (user_id);
