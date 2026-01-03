create extension if not exists pgcrypto;

-- =========================
-- user_settings (missing in repo, but referenced by migrations + app)
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

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- clients
-- =========================
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

-- =========================
-- projects
-- =========================
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

-- =========================
-- offers
-- =========================
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

  -- send metadata (some also added by later migrations; having them here is fine)
  sent_at timestamptz null,
  last_sent_at timestamptz null,
  last_sent_to text null,
  sent_count integer not null default 0,
  sent_via text null,

  invoice_id uuid null, -- fk added in later migration (offer_invoice_tracking)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offers_user_id on public.offers(user_id);
create index if not exists idx_offers_client_id on public.offers(client_id);
create index if not exists idx_offers_project_id on public.offers(project_id);

-- =========================
-- invoices
-- =========================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  number text null,
  offer_id uuid null references public.offers(id) on delete set null,
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

  -- lock + send metadata (some also added by later migrations; having them here is fine)
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
-- RLS for core tables (clients/projects/user_settings)
-- (offers/invoices RLS comes later in 20251235_rls_offers_invoices.sql)
-- =========================
alter table public.user_settings enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;

-- user_settings policies
drop policy if exists user_settings_select_own on public.user_settings;
drop policy if exists user_settings_insert_own on public.user_settings;
drop policy if exists user_settings_update_own on public.user_settings;

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

-- clients policies
drop policy if exists clients_select_own on public.clients;
drop policy if exists clients_insert_own on public.clients;
drop policy if exists clients_update_own on public.clients;
drop policy if exists clients_delete_own on public.clients;

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

-- projects policies
drop policy if exists projects_select_own on public.projects;
drop policy if exists projects_insert_own on public.projects;
drop policy if exists projects_update_own on public.projects;
drop policy if exists projects_delete_own on public.projects;

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
