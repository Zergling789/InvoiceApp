-- Canonicalize status values and enforce status transitions (DB-first)

update public.offers
set status = 'DRAFT'
where status is null;

update public.offers
set status = upper(status)
where status is not null;

update public.invoices
set status = 'DRAFT'
where status is null;

update public.invoices
set status = upper(status)
where status is not null;

alter table public.offers
  alter column status set default 'DRAFT';

alter table public.invoices
  alter column status set default 'DRAFT';

alter table public.offers
  drop constraint if exists chk_offers_status_canonical,
  add constraint chk_offers_status_canonical
    check (status in ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'INVOICED'));

alter table public.invoices
  drop constraint if exists chk_invoices_status_canonical,
  add constraint chk_invoices_status_canonical
    check (status in ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'OVERDUE'));

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
