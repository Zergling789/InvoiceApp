create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  document_type text not null,
  document_version text not null,
  document_sha256 text not null,
  accepted_at timestamptz not null default now(),
  request_id uuid,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint legal_acceptances_document_type_check
    check (document_type in ('TERMS', 'PRIVACY')),
  constraint legal_acceptances_document_version_check
    check (document_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint legal_acceptances_document_sha256_check
    check (document_sha256 ~ '^[a-f0-9]{64}$'),
  constraint legal_acceptances_user_document_version_unique
    unique (user_id, document_type, document_version)
);

create index if not exists legal_acceptances_user_id_idx
  on public.legal_acceptances (user_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

drop policy if exists legal_acceptances_select_own on public.legal_acceptances;
create policy legal_acceptances_select_own
  on public.legal_acceptances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.legal_acceptances from anon, authenticated;
grant select on table public.legal_acceptances to authenticated;

comment on table public.legal_acceptances is
  'Immutable, server-written evidence of accepted legal document versions. Users may read only their own records.';
