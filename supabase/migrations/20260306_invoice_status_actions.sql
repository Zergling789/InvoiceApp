-- Ensure invoice status model + transitions are enforced with audit fields.

alter table public.invoices
  add column if not exists paid_at timestamptz null,
  add column if not exists canceled_at timestamptz null;

alter table public.invoices
  alter column status set default 'DRAFT',
  alter column status set not null,
  alter column is_locked set default false,
  alter column is_locked set not null;

alter table public.invoices
  drop constraint if exists chk_invoices_status_canonical,
  add constraint chk_invoices_status_canonical
    check (status in ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'OVERDUE', 'CANCELED'));

create or replace function public.enforce_invoice_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'DRAFT' and new.status in ('ISSUED') then
      -- ok
    elsif old.status = 'ISSUED' and new.status in ('SENT', 'PAID', 'OVERDUE', 'CANCELED') then
      -- ok
    elsif old.status = 'SENT' and new.status in ('PAID', 'OVERDUE', 'CANCELED') then
      -- ok
    elsif old.status = 'OVERDUE' and new.status in ('PAID', 'CANCELED') then
      -- ok
    else
      raise exception 'Invoice status transition not allowed (% -> %)', old.status, new.status;
    end if;
  end if;

  if new.status in ('ISSUED', 'SENT', 'PAID', 'OVERDUE', 'CANCELED') then
    new.is_locked = true;
  elsif new.status = 'DRAFT' then
    new.is_locked = false;
  end if;

  if new.status = 'PAID' then
    if new.paid_at is null then
      new.paid_at = now();
    end if;
    if new.payment_date is null then
      new.payment_date = new.paid_at;
    end if;
  end if;

  if new.status = 'CANCELED' then
    if new.canceled_at is null then
      new.canceled_at = now();
    end if;
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

  if new.is_locked and new.status not in ('ISSUED', 'SENT', 'PAID', 'OVERDUE', 'CANCELED') then
    raise exception 'INVOICE_LOCK_INVALID_STATUS';
  end if;

  return new;
end;
$$;
