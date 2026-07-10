-- Align issued/finalized semantics: finalized_at is canonical.

alter table public.invoices
  drop column if exists issued_at;

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
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_validate_invoice_status_transition'
  ) then
    create trigger trg_validate_invoice_status_transition
    before update on public.invoices
    for each row
    execute function public.validate_invoice_status_transition();
  end if;
end$$;
