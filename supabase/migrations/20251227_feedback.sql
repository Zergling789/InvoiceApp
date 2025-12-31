create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  rating smallint null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_user_id
  on public.feedback(user_id);

create index if not exists idx_feedback_created_at
  on public.feedback(created_at desc);

alter table public.feedback enable row level security;

drop policy if exists feedback_select_own on public.feedback;
drop policy if exists feedback_insert_own on public.feedback;

create policy "feedback_select_own"
  on public.feedback for select
  using (user_id = auth.uid());

create policy "feedback_insert_own"
  on public.feedback for insert
  with check (user_id = auth.uid());
