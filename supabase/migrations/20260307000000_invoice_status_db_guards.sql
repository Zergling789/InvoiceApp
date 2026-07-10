-- Enforce invoice status transitions without persisted OVERDUE.

alter table public.invoices
  add column if not exists issued_at timestamptz null,
  add column if not exists paid_at timestamptz null,
  add column if not exists canceled_at timestamptz null;

update public.invoices
set status = case
  when sent_at is not null then 'SENT'
  else 'ISSUED'
end
where status = 'OVERDUE';

alter table public.invoices
  drop constraint if exists chk_invoices_status_canonical,
  add constraint chk_invoices_status_canonical
    check (status in ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELED'));

create or replace function public.validate_invoice_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'DRAFT' and new.status = 'ISSUED' then
      -- ok
    elsif old.status = 'ISSUED' and new.status in ('SENT', 'PAID', 'CANCELED') then
      -- ok
    elsif old.status = 'SENT' and new.status in ('PAID', 'CANCELED') then
      -- ok
    else
      raise exception 'Invoice status transition not allowed (% -> %)', old.status, new.status;
    end if;
  end if;

  if new.status <> 'DRAFT' then
    new.is_locked = true;
  else
    new.is_locked = false;
  end if;

  if old.status = 'DRAFT' and new.status = 'ISSUED' then
    new.issued_at = coalesce(new.issued_at, now());
    new.finalized_at = coalesce(new.finalized_at, now());
  elsif old.status = 'ISSUED' and new.status = 'SENT' then
    new.sent_at = coalesce(new.sent_at, now());
  elsif old.status in ('ISSUED', 'SENT') and new.status = 'PAID' then
    new.paid_at = coalesce(new.paid_at, now());
    new.payment_date = coalesce(new.payment_date, new.paid_at);
  elsif old.status in ('ISSUED', 'SENT') and new.status = 'CANCELED' then
    new.canceled_at = coalesce(new.canceled_at, now());
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'trg_enforce_invoice_status_transition'
  ) then
    drop trigger trg_enforce_invoice_status_transition on public.invoices;
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_validate_invoice_status_transition'
  ) then
    create trigger trg_validate_invoice_status_transition
    before update on public.invoices
    for each row
    execute function public.validate_invoice_status_transition();
  end if;
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
