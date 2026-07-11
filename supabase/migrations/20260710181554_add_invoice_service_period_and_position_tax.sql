alter table public.invoices
  add column if not exists service_date date,
  add column if not exists service_period_start date,
  add column if not exists service_period_end date;

alter table public.invoices
  drop constraint if exists invoices_service_period_dates_check,
  add constraint invoices_service_period_dates_check check (
    (service_period_start is null and service_period_end is null)
    or (service_period_start is not null and service_period_end is not null and service_period_end >= service_period_start)
  );

update public.invoices
set service_date = coalesce(invoice_date, date)
where service_date is null
  and service_period_start is null
  and service_period_end is null;

alter table public.invoices disable trigger trg_prevent_locked_invoice_content_update;

update public.invoices i
set positions = coalesce((
  select jsonb_agg(
    p.value || jsonb_build_object(
      'taxCategory', case
        when i.is_small_business then 'SMALL_BUSINESS'
        when coalesce(i.vat_rate, 0) = 0 then 'ZERO'
        when coalesce(i.vat_rate, 0) = 7 then 'REDUCED'
        else 'STANDARD'
      end,
      'taxRate', case when i.is_small_business then 0 else coalesce(i.vat_rate, 0) end
    ) order by p.ordinality
  )
  from jsonb_array_elements(coalesce(i.positions, '[]'::jsonb)) with ordinality as p(value, ordinality)
), '[]'::jsonb)
where jsonb_typeof(coalesce(i.positions, '[]'::jsonb)) = 'array';

alter table public.invoices enable trigger trg_prevent_locked_invoice_content_update;

update public.offers o
set positions = coalesce((
  select jsonb_agg(
    p.value || jsonb_build_object(
      'taxCategory', case when coalesce(o.vat_rate, 0) = 0 then 'ZERO' when coalesce(o.vat_rate, 0) = 7 then 'REDUCED' else 'STANDARD' end,
      'taxRate', coalesce(o.vat_rate, 0)
    ) order by p.ordinality
  )
  from jsonb_array_elements(coalesce(o.positions, '[]'::jsonb)) with ordinality as p(value, ordinality)
), '[]'::jsonb)
where jsonb_typeof(coalesce(o.positions, '[]'::jsonb)) = 'array';

create or replace function public.validate_invoice_fiscal_finalization()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  item jsonb;
  category text;
  rate numeric;
begin
  if new.status = 'DRAFT' or old.status is not distinct from new.status then
    return new;
  end if;

  if (new.service_date is null) = (new.service_period_start is null and new.service_period_end is null) then
    raise exception 'SERVICE_DATE_REQUIRED' using errcode = 'P0001';
  end if;
  if new.service_period_start is not null and new.service_period_end < new.service_period_start then
    raise exception 'SERVICE_PERIOD_INVALID' using errcode = 'P0001';
  end if;
  if jsonb_typeof(new.positions) <> 'array' or jsonb_array_length(new.positions) = 0 then
    raise exception 'INVOICE_POSITIONS_REQUIRED' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(new.positions)
  loop
    category := item->>'taxCategory';
    rate := nullif(item->>'taxRate', '')::numeric;
    if category not in ('STANDARD', 'REDUCED', 'ZERO', 'EXEMPT', 'SMALL_BUSINESS') then
      raise exception 'UNSUPPORTED_TAX_CASE' using errcode = 'P0001';
    end if;
    if category in ('ZERO', 'EXEMPT', 'SMALL_BUSINESS') and coalesce(rate, 0) <> 0 then
      raise exception 'POSITION_TAX_INVALID' using errcode = 'P0001';
    end if;
    if category in ('STANDARD', 'REDUCED') and coalesce(rate, 0) <= 0 then
      raise exception 'POSITION_TAX_INVALID' using errcode = 'P0001';
    end if;
    if category = 'EXEMPT' and nullif(btrim(item->>'taxExemptionReason'), '') is null then
      raise exception 'TAX_EXEMPTION_REASON_REQUIRED' using errcode = 'P0001';
    end if;
    if (category = 'SMALL_BUSINESS') <> new.is_small_business then
      raise exception 'SMALL_BUSINESS_TAX_MISMATCH' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.validate_invoice_fiscal_finalization() from public, anon, authenticated;
drop trigger if exists trg_00_validate_invoice_fiscal_finalization on public.invoices;
create trigger trg_00_validate_invoice_fiscal_finalization
before update of status on public.invoices
for each row execute function public.validate_invoice_fiscal_finalization();
