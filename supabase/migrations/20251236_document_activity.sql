create extension if not exists pgcrypto;

create table if not exists public.document_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('offer', 'invoice')),
  doc_id uuid not null,
  event_type text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_activity_user_id
  on public.document_activity(user_id);
create index if not exists idx_document_activity_doc
  on public.document_activity(doc_type, doc_id, created_at desc);

alter table public.document_activity enable row level security;

drop policy if exists document_activity_select_own on public.document_activity;
drop policy if exists document_activity_insert_own on public.document_activity;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_activity' and policyname = 'document_activity_select_own'
  ) then
    create policy document_activity_select_own
      on public.document_activity for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_activity' and policyname = 'document_activity_insert_own'
  ) then
    create policy document_activity_insert_own
      on public.document_activity for insert
      with check (user_id = auth.uid());
  end if;
end$$;
