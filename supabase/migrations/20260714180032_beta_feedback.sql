create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('BUG','UNDERSTANDING','FEATURE_REQUEST')),
  message text not null check (length(message) between 3 and 4000),
  route text not null check (length(route) between 1 and 300),
  request_id text,
  created_at timestamptz not null default now()
);
alter table public.beta_feedback enable row level security;
revoke all on table public.beta_feedback from public, anon, authenticated;
comment on table public.beta_feedback is 'Server-written beta feedback without automatic document or screenshot capture.';
