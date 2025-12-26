create table if not exists public.document_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('offer','invoice')),
  counter bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, doc_type)
);

alter table public.document_counters
  add column if not exists counter bigint not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_document_counters_user_id
  on public.document_counters(user_id);

alter table public.document_counters enable row level security;

drop policy if exists document_counters_select_own on public.document_counters;
drop policy if exists document_counters_insert_own on public.document_counters;
drop policy if exists document_counters_update_own on public.document_counters;

create policy "document_counters_select_own"
  on public.document_counters for select
  using (user_id = auth.uid());

create policy "document_counters_insert_own"
  on public.document_counters for insert
  with check (user_id = auth.uid());

create policy "document_counters_update_own"
  on public.document_counters for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop function if exists public.next_document_number(text);

create or replace function public.next_document_number(doc_type_param text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_val bigint;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if doc_type_param not in ('offer','invoice') then
    raise exception 'Invalid document type';
  end if;

  insert into public.document_counters (user_id, doc_type, counter, updated_at)
  values (uid, doc_type_param, 1, now())
  on conflict (user_id, doc_type)
  do update set counter = public.document_counters.counter + 1, updated_at = now()
  returning counter into next_val;

  return next_val;
end;
$$;
