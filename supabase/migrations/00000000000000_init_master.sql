create extension if not exists pgcrypto;

-- =========================
-- core tables
-- =========================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,

  name text not null default '',
  company_name text not null default '',
  address text not null default '',
  tax_id text not null default '',

  default_vat_rate integer not null default 19,
  default_payment_terms integer not null default 14,

  iban text not null default '',
  bic text not null default '',
  bank_name text not null default '',
  email text not null default '',

  email_default_subject text not null default 'Dokument {nummer}',
  email_default_text text not null default 'Bitte im Anhang finden Sie das Dokument.',

  logo_url text not null default '',
  primary_color text not null default '#4f46e5',
  template_id text not null default 'default',

  locale text not null default 'de-DE',
  currency text not null default 'EUR',

  prefix_invoice text not null default 'RE',
  prefix_offer text not null default 'ANG',
  number_padding integer not null default 4,

  footer_text text not null default '',
  default_sender_identity_id uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  company_name text null,
  contact_person text null,
  email text null,
  address text null,
  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_user_id on public.clients(user_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,

  name text not null,
  budget_type text not null check (budget_type in ('hourly','fixed')),
  hourly_rate numeric null,
  budget_total numeric null,
  status text not null check (status in ('active','completed','archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_client_id on public.projects(client_id);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  number text not null default '',
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete set null,

  date date not null default current_date,
  valid_until date null,

  positions jsonb not null default '[]'::jsonb,
  vat_rate numeric not null default 0,

  intro_text text not null default '',
  footer_text text not null default '',

  status text not null default 'DRAFT',

  sent_at timestamptz null,
  last_sent_at timestamptz null,
  last_sent_to text null,
  sent_count integer not null default 0,
  sent_via text null,

  currency text not null default 'EUR',
  invoice_id uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offers_user_id on public.offers(user_id);
create index if not exists idx_offers_client_id on public.offers(client_id);
create index if not exists idx_offers_project_id on public.offers(project_id);
create index if not exists idx_offers_invoice_id on public.offers(invoice_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  number text null,
  offer_id uuid null,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete set null,

  date date not null default current_date,
  due_date date null,
  payment_date timestamptz null,

  positions jsonb not null default '[]'::jsonb,
  vat_rate numeric not null default 0,

  intro_text text not null default '',
  footer_text text not null default '',

  status text not null default 'DRAFT',

  is_locked boolean not null default false,
  finalized_at timestamptz null,

  sent_at timestamptz null,
  last_sent_at timestamptz null,
  last_sent_to text null,
  sent_count integer not null default 0,
  sent_via text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_project_id on public.invoices(project_id);
create index if not exists idx_invoices_offer_id on public.invoices(offer_id);

-- =========================
-- sender identities + audit
-- =========================
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

-- =========================
-- document counters + activity
-- =========================
create table if not exists public.document_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('offer','invoice')),
  counter bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, doc_type)
);

create index if not exists idx_document_counters_user_id
  on public.document_counters(user_id);

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

-- =========================
-- add FKs after core tables exist
-- =========================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_user_settings_default_sender_identity'
  ) then
    alter table public.user_settings
      add constraint fk_user_settings_default_sender_identity
      foreign key (default_sender_identity_id)
      references public.sender_identities(id)
      on delete set null;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_offers_invoice_id'
  ) then
    alter table public.offers
      add constraint fk_offers_invoice_id
      foreign key (invoice_id)
      references public.invoices(id)
      on delete set null;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_invoices_offer_id'
  ) then
    alter table public.invoices
      add constraint fk_invoices_offer_id
      foreign key (offer_id)
      references public.offers(id)
      on delete set null;
  end if;
end$$;

-- =========================
-- status constraints
-- =========================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_offers_status_canonical'
  ) then
    alter table public.offers
      add constraint chk_offers_status_canonical
      check (status in ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'INVOICED'));
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_invoices_status_canonical'
  ) then
    alter table public.invoices
      add constraint chk_invoices_status_canonical
      check (status in ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'OVERDUE'));
  end if;
end$$;

-- =========================
-- RLS enablement
-- =========================
alter table public.user_settings enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.offers enable row level security;
alter table public.invoices enable row level security;
alter table public.sender_identities enable row level security;
alter table public.sender_identity_tokens enable row level security;
alter table public.audit_events enable row level security;
alter table public.document_counters enable row level security;
alter table public.document_activity enable row level security;

-- =========================
-- policies
-- =========================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_settings' and policyname = 'user_settings_select_own'
  ) then
    create policy user_settings_select_own
      on public.user_settings for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_settings' and policyname = 'user_settings_insert_own'
  ) then
    create policy user_settings_insert_own
      on public.user_settings for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_settings' and policyname = 'user_settings_update_own'
  ) then
    create policy user_settings_update_own
      on public.user_settings for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_select_own'
  ) then
    create policy clients_select_own
      on public.clients for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_insert_own'
  ) then
    create policy clients_insert_own
      on public.clients for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_update_own'
  ) then
    create policy clients_update_own
      on public.clients for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_delete_own'
  ) then
    create policy clients_delete_own
      on public.clients for delete
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_select_own'
  ) then
    create policy projects_select_own
      on public.projects for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_insert_own'
  ) then
    create policy projects_insert_own
      on public.projects for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_update_own'
  ) then
    create policy projects_update_own
      on public.projects for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_delete_own'
  ) then
    create policy projects_delete_own
      on public.projects for delete
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_select_own'
  ) then
    create policy offers_select_own
      on public.offers for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_insert_own'
  ) then
    create policy offers_insert_own
      on public.offers for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_update_own'
  ) then
    create policy offers_update_own
      on public.offers for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_delete_own'
  ) then
    create policy offers_delete_own
      on public.offers for delete
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_select_own'
  ) then
    create policy invoices_select_own
      on public.invoices for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_insert_own'
  ) then
    create policy invoices_insert_own
      on public.invoices for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_update_own'
  ) then
    create policy invoices_update_own
      on public.invoices for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_delete_own'
  ) then
    create policy invoices_delete_own
      on public.invoices for delete
      using (user_id = auth.uid());
  end if;
end$$;

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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_counters' and policyname = 'document_counters_select_own'
  ) then
    create policy "document_counters_select_own"
      on public.document_counters for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_counters' and policyname = 'document_counters_insert_own'
  ) then
    create policy "document_counters_insert_own"
      on public.document_counters for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_counters' and policyname = 'document_counters_update_own'
  ) then
    create policy "document_counters_update_own"
      on public.document_counters for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

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

-- =========================
-- RPCs + triggers
-- =========================
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

create or replace function public.enforce_offer_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'DRAFT' and new.status in ('SENT') then
      return new;
    end if;
    if old.status = 'SENT' and new.status in ('ACCEPTED', 'REJECTED', 'INVOICED') then
      return new;
    end if;
    if old.status = 'ACCEPTED' and new.status in ('INVOICED') then
      return new;
    end if;
    raise exception 'Offer status transition not allowed (% -> %)', old.status, new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_offer_status_transition on public.offers;
create trigger trg_enforce_offer_status_transition
before update on public.offers
for each row
execute function public.enforce_offer_status_transition();

create or replace function public.enforce_invoice_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'DRAFT' and new.status in ('ISSUED') then
      return new;
    end if;
    if old.status = 'ISSUED' and new.status in ('SENT', 'OVERDUE') then
      return new;
    end if;
    if old.status = 'SENT' and new.status in ('PAID', 'OVERDUE') then
      return new;
    end if;
    if old.status = 'OVERDUE' and new.status in ('PAID') then
      return new;
    end if;
    raise exception 'Invoice status transition not allowed (% -> %)', old.status, new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_invoice_status_transition on public.invoices;
create trigger trg_enforce_invoice_status_transition
before update on public.invoices
for each row
execute function public.enforce_invoice_status_transition();

create or replace function public.prevent_locked_invoice_content_update()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked then
    if new.number is distinct from old.number
      or new.offer_id is distinct from old.offer_id
      or new.client_id is distinct from old.client_id
      or new.project_id is distinct from old.project_id
      or new.date is distinct from old.date
      or new.due_date is distinct from old.due_date
      or new.positions is distinct from old.positions
      or new.vat_rate is distinct from old.vat_rate
      or new.intro_text is distinct from old.intro_text
      or new.footer_text is distinct from old.footer_text
    then
      raise exception 'INVOICE_LOCKED_CONTENT';
    end if;
  end if;

  if new.is_locked and new.status not in ('ISSUED', 'SENT', 'PAID', 'OVERDUE') then
    raise exception 'INVOICE_LOCK_INVALID_STATUS';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_locked_invoice_content_update on public.invoices;
create trigger trg_prevent_locked_invoice_content_update
before update on public.invoices
for each row
execute function public.prevent_locked_invoice_content_update();

create or replace function public.finalize_invoice(invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.invoices;
  next_num bigint;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if invoice_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into inv
  from public.invoices
  where id = invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;
  if inv.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;

  if inv.status = 'ISSUED' then
    return inv;
  end if;

  if inv.status <> 'DRAFT' then
    raise exception 'Invoice status transition not allowed';
  end if;

  next_num := public.next_document_number('invoice');

  update public.invoices
  set number = case
        when inv.number is null or btrim(inv.number) = '' then next_num::text
        else inv.number
      end,
      status = 'ISSUED',
      is_locked = true,
      finalized_at = now(),
      updated_at = now()
  where id = invoice_id
  returning * into inv;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (uid, 'invoice', invoice_id, 'FINALIZED', '{}'::jsonb);

  return inv;
end;
$$;

create or replace function public.mark_offer_sent(doc_id uuid, p_to text, p_via text)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.offers;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if doc_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into rec
  from public.offers
  where id = doc_id
  for update;

  if not found then
    raise exception 'Offer not found';
  end if;
  if rec.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;

  if rec.status = 'DRAFT' then
    update public.offers
    set status = 'SENT',
        sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  else
    update public.offers
    set sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  end if;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (
    uid,
    'offer',
    doc_id,
    'SENT',
    jsonb_build_object('to', p_to, 'via', p_via)
  );

  return rec;
end;
$$;

create or replace function public.mark_invoice_sent(doc_id uuid, p_to text, p_via text)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.invoices;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if doc_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into rec
  from public.invoices
  where id = doc_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;
  if rec.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;

  if rec.status = 'ISSUED' then
    update public.invoices
    set status = 'SENT',
        sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  else
    update public.invoices
    set sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  end if;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (
    uid,
    'invoice',
    doc_id,
    'SENT',
    jsonb_build_object('to', p_to, 'via', p_via)
  );

  return rec;
end;
$$;

create or replace function public.convert_offer_to_invoice(offer_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  offer_rec public.offers;
  inv public.invoices;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if offer_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into offer_rec
  from public.offers
  where id = offer_id
  for update;

  if not found then
    raise exception 'Offer not found';
  end if;
  if offer_rec.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;
  if offer_rec.status not in ('SENT', 'ACCEPTED') then
    raise exception 'Offer status transition not allowed';
  end if;

  insert into public.invoices (
    user_id,
    offer_id,
    client_id,
    project_id,
    date,
    due_date,
    positions,
    vat_rate,
    intro_text,
    footer_text,
    status,
    number,
    is_locked,
    updated_at
  )
  values (
    uid,
    offer_rec.id,
    offer_rec.client_id,
    offer_rec.project_id,
    offer_rec.date,
    offer_rec.valid_until,
    offer_rec.positions,
    offer_rec.vat_rate,
    offer_rec.intro_text,
    offer_rec.footer_text,
    'DRAFT',
    null,
    false,
    now()
  )
  returning * into inv;

  update public.offers
  set status = 'INVOICED',
      invoice_id = inv.id,
      updated_at = now()
  where id = offer_rec.id;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (
    uid,
    'offer',
    offer_rec.id,
    'CONVERTED',
    jsonb_build_object('invoice_id', inv.id)
  );

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (uid, 'invoice', inv.id, 'CREATED', '{}'::jsonb);

  return inv;
end;
$$;

create or replace function public.log_offer_activity()
returns trigger
language plpgsql
as $$
declare
  uid uuid := auth.uid();
  should_log boolean := false;
begin
  if uid is null or uid <> new.user_id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
    values (uid, 'offer', new.id, 'CREATED', '{}'::jsonb);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    should_log :=
      new.number is distinct from old.number
      or new.client_id is distinct from old.client_id
      or new.project_id is distinct from old.project_id
      or new.date is distinct from old.date
      or new.valid_until is distinct from old.valid_until
      or new.positions is distinct from old.positions
      or new.vat_rate is distinct from old.vat_rate
      or new.intro_text is distinct from old.intro_text
      or new.footer_text is distinct from old.footer_text
      or new.status is distinct from old.status
      or new.invoice_id is distinct from old.invoice_id;

    if should_log then
      insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
      values (uid, 'offer', new.id, 'UPDATED', '{}'::jsonb);
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.log_invoice_activity()
returns trigger
language plpgsql
as $$
declare
  uid uuid := auth.uid();
  should_log boolean := false;
begin
  if uid is null or uid <> new.user_id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
    values (uid, 'invoice', new.id, 'CREATED', '{}'::jsonb);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    should_log :=
      new.number is distinct from old.number
      or new.client_id is distinct from old.client_id
      or new.project_id is distinct from old.project_id
      or new.date is distinct from old.date
      or new.due_date is distinct from old.due_date
      or new.payment_date is distinct from old.payment_date
      or new.positions is distinct from old.positions
      or new.vat_rate is distinct from old.vat_rate
      or new.intro_text is distinct from old.intro_text
      or new.footer_text is distinct from old.footer_text
      or new.status is distinct from old.status
      or new.offer_id is distinct from old.offer_id;

    if should_log then
      insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
      values (uid, 'invoice', new.id, 'UPDATED', '{}'::jsonb);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_offers_activity_insert on public.offers;
create trigger trg_offers_activity_insert
after insert on public.offers
for each row
execute function public.log_offer_activity();

drop trigger if exists trg_offers_activity_update on public.offers;
create trigger trg_offers_activity_update
after update on public.offers
for each row
execute function public.log_offer_activity();

drop trigger if exists trg_invoices_activity_insert on public.invoices;
create trigger trg_invoices_activity_insert
after insert on public.invoices
for each row
execute function public.log_invoice_activity();

drop trigger if exists trg_invoices_activity_update on public.invoices;
create trigger trg_invoices_activity_update
after update on public.invoices
for each row
execute function public.log_invoice_activity();
