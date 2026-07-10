-- Ensure due_date is DB-calculated and locked after finalize.

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
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_set_invoice_due_date'
  ) then
    create trigger trg_set_invoice_due_date
      before insert or update on public.invoices
      for each row
      execute function public.set_invoice_due_date();
  end if;
end$$;

create or replace function public.prevent_locked_invoice_content_update()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked or old.finalized_at is not null then
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
