-- Invoice numbering sequences and formatting
alter table public.user_settings
  add column if not exists invoice_number_prefix text not null default 'RE',
  add column if not exists invoice_number_next integer not null default 1,
  add column if not exists invoice_number_padding integer not null default 3,
  add column if not exists invoice_number_include_year boolean not null default true;

alter table public.invoices
  add column if not exists invoice_number text null;

update public.invoices
set invoice_number = number
where invoice_number is null
  and number is not null
  and btrim(number) <> '';

create unique index if not exists idx_invoices_user_invoice_number_unique
  on public.invoices(user_id, invoice_number)
  where invoice_number is not null;

create or replace function public.prevent_finalized_invoice_number_update()
returns trigger
language plpgsql
as $$
begin
  if old.finalized_at is not null
    and new.invoice_number is distinct from old.invoice_number
  then
    raise exception 'INVOICE_NUMBER_IMMUTABLE';
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'trg_prevent_finalized_invoice_number_update'
  ) then
    drop trigger trg_prevent_finalized_invoice_number_update on public.invoices;
  end if;
  create trigger trg_prevent_finalized_invoice_number_update
  before update on public.invoices
  for each row
  execute function public.prevent_finalized_invoice_number_update();
end$$;

create or replace function public.prevent_locked_invoice_content_update()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked then
    if new.invoice_number is distinct from old.invoice_number
      or new.number is distinct from old.number
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
