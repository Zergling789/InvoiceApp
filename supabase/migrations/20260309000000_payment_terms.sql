-- Add payment terms defaults and invoice due date snapshotting.

-- =========================
-- user_settings
-- =========================
alter table public.user_settings
  add column if not exists payment_terms_days integer;

alter table public.user_settings
  alter column payment_terms_days set default 14;

update public.user_settings
set payment_terms_days = coalesce(payment_terms_days, default_payment_terms, 14)
where payment_terms_days is null;

alter table public.user_settings
  alter column payment_terms_days set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_user_settings_payment_terms_days'
  ) then
    alter table public.user_settings
      add constraint chk_user_settings_payment_terms_days
      check (payment_terms_days >= 0 and payment_terms_days <= 365);
  end if;
end$$;

-- =========================
-- invoices
-- =========================
alter table public.invoices
  add column if not exists invoice_date date;

alter table public.invoices
  alter column invoice_date set default current_date;

alter table public.invoices
  add column if not exists payment_terms_days integer;

alter table public.invoices
  alter column payment_terms_days set default 14;

update public.invoices
set invoice_date = coalesce(invoice_date, date, finalized_at::date, created_at::date, current_date)
where invoice_date is null;

update public.invoices
set payment_terms_days = coalesce(
  payment_terms_days,
  (select us.payment_terms_days from public.user_settings us where us.user_id = invoices.user_id),
  14
)
where payment_terms_days is null;

update public.invoices
set date = coalesce(date, invoice_date)
where date is null;

update public.invoices
set due_date = (invoice_date + make_interval(days => payment_terms_days))::date;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'invoice_date'
      and is_nullable = 'YES'
  ) then
    alter table public.invoices
      alter column invoice_date set not null;
  end if;
end$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'payment_terms_days'
      and is_nullable = 'YES'
  ) then
    alter table public.invoices
      alter column payment_terms_days set not null;
  end if;
end$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'due_date'
      and is_nullable = 'YES'
  ) then
    alter table public.invoices
      alter column due_date set not null;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_invoices_payment_terms_days'
  ) then
    alter table public.invoices
      add constraint chk_invoices_payment_terms_days
      check (payment_terms_days >= 0 and payment_terms_days <= 365);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_invoices_due_date_after_invoice_date'
  ) then
    alter table public.invoices
      add constraint chk_invoices_due_date_after_invoice_date
      check (due_date >= invoice_date);
  end if;
end$$;

create or replace function public.set_invoice_due_date()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_date is null then
    new.invoice_date := coalesce(new.date, current_date);
  end if;

  if new.date is null then
    new.date := new.invoice_date;
  end if;

  if new.payment_terms_days is null then
    new.payment_terms_days := 14;
  end if;

  new.due_date := (new.invoice_date + make_interval(days => new.payment_terms_days))::date;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'trg_set_invoice_due_date'
  ) then
    drop trigger trg_set_invoice_due_date on public.invoices;
  end if;

  create trigger trg_set_invoice_due_date
    before insert or update on public.invoices
    for each row
    execute function public.set_invoice_due_date();
end$$;

create or replace function public.prevent_locked_invoice_content_update()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked then
    if new.is_locked is distinct from old.is_locked
      or new.finalized_at is distinct from old.finalized_at
      or new.invoice_number is distinct from old.invoice_number
      or new.number is distinct from old.number
      or new.offer_id is distinct from old.offer_id
      or new.client_id is distinct from old.client_id
      or new.project_id is distinct from old.project_id
      or new.date is distinct from old.date
      or new.invoice_date is distinct from old.invoice_date
      or new.payment_terms_days is distinct from old.payment_terms_days
      or new.due_date is distinct from old.due_date
      or new.positions is distinct from old.positions
      or new.vat_rate is distinct from old.vat_rate
      or new.intro_text is distinct from old.intro_text
      or new.footer_text is distinct from old.footer_text
    then
      raise exception 'INVOICE_LOCKED_CONTENT';
    end if;
  end if;

  if new.is_locked and new.status not in ('ISSUED', 'SENT', 'PAID', 'CANCELED') then
    raise exception 'INVOICE_LOCK_INVALID_STATUS';
  end if;

  return new;
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
  terms_days integer := 14;
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

  select coalesce(payment_terms_days, default_payment_terms, 14)
    into terms_days
  from public.user_settings
  where user_id = uid;

  insert into public.invoices (
    user_id,
    offer_id,
    client_id,
    project_id,
    date,
    invoice_date,
    payment_terms_days,
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
    offer_rec.date,
    terms_days,
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
