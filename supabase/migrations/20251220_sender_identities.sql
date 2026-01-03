create extension if not exists pgcrypto;

create table if not exists public.sender_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text null,
  status text not null check (status in ('pending','verified','disabled')),
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_verification_sent_at timestamptz null,
  last_used_at timestamptz null,
  unique (user_id, email)
);

create index if not exists idx_sender_identities_user_id
  on public.sender_identities(user_id);

create table if not exists public.sender_identity_tokens (
  id uuid primary key default gen_random_uuid(),
  sender_identity_id uuid not null references public.sender_identities(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  request_ip inet null,
  user_agent text null
);

create index if not exists idx_sender_identity_tokens_sender_identity_id
  on public.sender_identity_tokens(sender_identity_id);
create index if not exists idx_sender_identity_tokens_token_hash
  on public.sender_identity_tokens(token_hash);
create index if not exists idx_sender_identity_tokens_expires_at
  on public.sender_identity_tokens(expires_at);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_user_id
  on public.audit_events(user_id);
create index if not exists idx_audit_events_action
  on public.audit_events(action);

alter table public.user_settings
  add column if not exists default_sender_identity_id uuid null
  references public.sender_identities(id) on delete set null;

alter table public.sender_identities enable row level security;
alter table public.sender_identity_tokens enable row level security;
alter table public.audit_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sender_identities' and policyname = 'sender_identities_select_own'
  ) then
    create policy "sender_identities_select_own"
      on public.sender_identities for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sender_identities' and policyname = 'sender_identities_insert_own'
  ) then
    create policy "sender_identities_insert_own"
      on public.sender_identities for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sender_identities' and policyname = 'sender_identities_update_own'
  ) then
    create policy "sender_identities_update_own"
      on public.sender_identities for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sender_identities' and policyname = 'sender_identities_delete_own'
  ) then
    create policy "sender_identities_delete_own"
      on public.sender_identities for delete
      using (user_id = auth.uid());
  end if;
end$$;
