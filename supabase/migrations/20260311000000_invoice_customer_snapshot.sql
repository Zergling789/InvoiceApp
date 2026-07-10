-- Add invoice-level customer snapshot fields
alter table public.invoices
  add column if not exists client_name text not null default '',
  add column if not exists client_company_name text null,
  add column if not exists client_contact_person text null,
  add column if not exists client_email text null,
  add column if not exists client_phone text null,
  add column if not exists client_vat_id text null,
  add column if not exists client_address text null;

-- Backfill snapshot fields from current client records
update public.invoices as inv
set
  client_company_name = coalesce(inv.client_company_name, nullif(btrim(c.company_name), '')),
  client_contact_person = coalesce(inv.client_contact_person, nullif(btrim(c.contact_person), '')),
  client_email = coalesce(inv.client_email, nullif(btrim(c.email), '')),
  client_address = coalesce(inv.client_address, nullif(btrim(c.address), '')),
  client_name = coalesce(
    nullif(btrim(inv.client_name), ''),
    nullif(btrim(c.company_name), ''),
    nullif(btrim(c.contact_person), ''),
    ''
  )
from public.clients c
where inv.client_id = c.id;

-- Ensure customer name is set for non-draft invoices
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_invoices_client_name_required'
  ) then
    alter table public.invoices
      add constraint chk_invoices_client_name_required
      check (status = 'DRAFT' or btrim(client_name) <> '');
  end if;
end$$;

create or replace function public.copy_customer_snapshot_to_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.invoices;
  client_rec public.clients;
  resolved_name text;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_invoice_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into inv
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;
  if inv.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;
  if inv.client_id is null then
    raise exception 'CLIENT_REQUIRED';
  end if;

  select * into client_rec
  from public.clients
  where id = inv.client_id
    and user_id = uid;

  if not found then
    raise exception 'Client not found';
  end if;

  resolved_name := coalesce(nullif(btrim(client_rec.company_name), ''), nullif(btrim(client_rec.contact_person), ''), '');

  update public.invoices
  set client_name = resolved_name,
      client_company_name = nullif(btrim(client_rec.company_name), ''),
      client_contact_person = nullif(btrim(client_rec.contact_person), ''),
      client_email = nullif(btrim(client_rec.email), ''),
      client_address = nullif(btrim(client_rec.address), ''),
      updated_at = now()
  where id = p_invoice_id
  returning * into inv;

  return inv;
end;
$$;

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
      or new.client_name is distinct from old.client_name
      or new.client_company_name is distinct from old.client_company_name
      or new.client_contact_person is distinct from old.client_contact_person
      or new.client_email is distinct from old.client_email
      or new.client_phone is distinct from old.client_phone
      or new.client_vat_id is distinct from old.client_vat_id
      or new.client_address is distinct from old.client_address
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

create or replace function public.finalize_invoice(invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.invoices;
  seq_prefix text;
  seq_padding integer;
  seq_include_year boolean;
  assigned_num integer;
  number_part text;
  formatted_number text;
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

  if inv.finalized_at is not null or inv.status = 'ISSUED' then
    return inv;
  end if;

  if inv.status <> 'DRAFT' then
    raise exception 'Invoice status transition not allowed';
  end if;

  if inv.client_id is null then
    raise exception 'CLIENT_REQUIRED';
  end if;

  if inv.client_name is null or btrim(inv.client_name) = '' then
    inv := public.copy_customer_snapshot_to_invoice(invoice_id);
  end if;

  if inv.client_name is null or btrim(inv.client_name) = '' then
    raise exception 'CLIENT_NAME_REQUIRED';
  end if;

  if inv.invoice_number is null or btrim(inv.invoice_number) = '' then
    insert into public.user_settings (user_id)
    values (uid)
    on conflict (user_id) do nothing;

    update public.user_settings
    set invoice_number_next = coalesce(invoice_number_next, 1) + 1,
        updated_at = now()
    where user_id = uid
    returning
      invoice_number_prefix,
      invoice_number_padding,
      invoice_number_include_year,
      (invoice_number_next - 1) into seq_prefix, seq_padding, seq_include_year, assigned_num;

    seq_padding := greatest(1, coalesce(seq_padding, 3));
    seq_prefix := coalesce(nullif(btrim(seq_prefix), ''), 'RE');
    number_part := lpad(assigned_num::text, seq_padding, '0');

    if seq_include_year then
      if seq_prefix is null or btrim(seq_prefix) = '' then
        formatted_number := to_char(now(), 'YYYY') || '-' || number_part;
      else
        formatted_number := seq_prefix || '-' || to_char(now(), 'YYYY') || '-' || number_part;
      end if;
    else
      if seq_prefix is null or btrim(seq_prefix) = '' then
        formatted_number := number_part;
      else
        formatted_number := seq_prefix || '-' || number_part;
      end if;
    end if;

    update public.invoices
    set invoice_number = formatted_number,
        number = coalesce(inv.number, formatted_number),
        status = 'ISSUED',
        is_locked = true,
        finalized_at = now(),
        updated_at = now()
    where id = invoice_id
    returning * into inv;
  else
    update public.invoices
    set status = 'ISSUED',
        is_locked = true,
        finalized_at = now(),
        updated_at = now()
    where id = invoice_id
    returning * into inv;
  end if;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (uid, 'invoice', invoice_id, 'FINALIZED', '{}'::jsonb);

  return inv;
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
  client_rec public.clients;
  resolved_name text;
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

  select * into client_rec
  from public.clients
  where id = offer_rec.client_id
    and user_id = uid;

  if not found then
    raise exception 'Client not found';
  end if;

  resolved_name := coalesce(nullif(btrim(client_rec.company_name), ''), nullif(btrim(client_rec.contact_person), ''), '');

  insert into public.invoices (
    user_id,
    offer_id,
    client_id,
    client_name,
    client_company_name,
    client_contact_person,
    client_email,
    client_address,
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
    resolved_name,
    nullif(btrim(client_rec.company_name), ''),
    nullif(btrim(client_rec.contact_person), ''),
    nullif(btrim(client_rec.email), ''),
    nullif(btrim(client_rec.address), ''),
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
