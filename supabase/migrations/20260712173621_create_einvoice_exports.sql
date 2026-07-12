create table if not exists public.einvoice_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  format text not null,
  profile text not null,
  version text not null,
  status text not null,
  validation_result jsonb not null default '{}'::jsonb,
  content_hash text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint einvoice_exports_format_check check (format in ('ZUGFERD_PDF', 'CII_XML')),
  constraint einvoice_exports_profile_check check (profile = 'EN16931'),
  constraint einvoice_exports_status_check check (status in ('GENERATED', 'FAILED')),
  constraint einvoice_exports_hash_check check (
    (status = 'GENERATED' and content_hash ~ '^[0-9a-f]{64}$' and generated_at is not null)
    or (status = 'FAILED' and content_hash is null)
  )
);

create index if not exists einvoice_exports_owner_invoice_idx
  on public.einvoice_exports (user_id, invoice_id, created_at desc);

alter table public.einvoice_exports enable row level security;

drop policy if exists einvoice_exports_select_own on public.einvoice_exports;
create policy einvoice_exports_select_own
  on public.einvoice_exports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.einvoice_exports from anon, authenticated;
grant select on table public.einvoice_exports to authenticated;

comment on table public.einvoice_exports is
  'Append-only metadata for reproducible electronic invoice exports; binary artifacts are generated on demand.';
