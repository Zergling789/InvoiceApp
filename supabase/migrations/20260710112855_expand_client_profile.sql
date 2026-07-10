-- Structured customer profiles. Existing combined address remains the fallback.
alter table public.clients
  add column if not exists customer_number text null,
  add column if not exists first_name text null,
  add column if not exists last_name text null,
  add column if not exists job_title text null,
  add column if not exists department text null,
  add column if not exists phone text null,
  add column if not exists mobile text null,
  add column if not exists website text null,
  add column if not exists street text null,
  add column if not exists house_number text null,
  add column if not exists address_addition text null,
  add column if not exists postal_code text null,
  add column if not exists city text null,
  add column if not exists state text null,
  add column if not exists country text null default 'Deutschland',
  add column if not exists legal_form text null,
  add column if not exists industry text null,
  add column if not exists vat_id text null,
  add column if not exists tax_number text null,
  add column if not exists registration_number text null,
  add column if not exists invoice_email text null,
  add column if not exists billing_address text null,
  add column if not exists payment_terms_days integer null,
  add column if not exists currency text null,
  add column if not exists default_vat_rate numeric null,
  add column if not exists preferred_language text null default 'de',
  add column if not exists preferred_delivery_method text null default 'email',
  add column if not exists source text null,
  add column if not exists tags text[] not null default '{}',
  add column if not exists last_contact_at timestamptz null,
  add column if not exists next_follow_up_at timestamptz null;

alter table public.clients
  drop constraint if exists clients_payment_terms_days_check,
  add constraint clients_payment_terms_days_check check (payment_terms_days is null or payment_terms_days between 0 and 365),
  drop constraint if exists clients_currency_check,
  add constraint clients_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  drop constraint if exists clients_default_vat_rate_check,
  add constraint clients_default_vat_rate_check check (default_vat_rate is null or default_vat_rate between 0 and 100),
  drop constraint if exists clients_delivery_method_check,
  add constraint clients_delivery_method_check check (preferred_delivery_method is null or preferred_delivery_method in ('email', 'download', 'post'));

create unique index if not exists clients_user_customer_number_unique
  on public.clients (user_id, customer_number)
  where customer_number is not null and btrim(customer_number) <> '';

create index if not exists clients_user_email_idx on public.clients (user_id, email);
create index if not exists clients_user_follow_up_idx on public.clients (user_id, next_follow_up_at)
  where next_follow_up_at is not null;
