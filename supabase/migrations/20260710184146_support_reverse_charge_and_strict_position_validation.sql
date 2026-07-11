create or replace function public.validate_invoice_fiscal_finalization()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare item jsonb; category text; rate numeric; quantity numeric; price numeric;
begin
  if new.status = 'DRAFT' or (tg_op = 'UPDATE' and old.status is not distinct from new.status) then return new; end if;
  if (new.service_date is null) = (new.service_period_start is null and new.service_period_end is null) then raise exception 'SERVICE_DATE_REQUIRED' using errcode = 'P0001'; end if;
  if new.service_period_start is not null and new.service_period_end < new.service_period_start then raise exception 'SERVICE_PERIOD_INVALID' using errcode = 'P0001'; end if;
  if jsonb_typeof(new.positions) <> 'array' or jsonb_array_length(new.positions) = 0 then raise exception 'INVOICE_POSITIONS_REQUIRED' using errcode = 'P0001'; end if;
  for item in select value from jsonb_array_elements(new.positions) loop
    category := item->>'taxCategory'; rate := nullif(item->>'taxRate', '')::numeric;
    quantity := nullif(item->>'quantity', '')::numeric; price := nullif(item->>'price', '')::numeric;
    if nullif(btrim(item->>'description'), '') is null or coalesce(quantity, -1) < 0 or coalesce(price, -1) < 0 then raise exception 'POSITION_CONTENT_INVALID' using errcode = 'P0001'; end if;
    if category not in ('STANDARD', 'REDUCED', 'ZERO', 'EXEMPT', 'REVERSE_CHARGE', 'SMALL_BUSINESS') then raise exception 'UNSUPPORTED_TAX_CASE' using errcode = 'P0001'; end if;
    if category in ('ZERO', 'EXEMPT', 'REVERSE_CHARGE', 'SMALL_BUSINESS') and coalesce(rate, 0) <> 0 then raise exception 'POSITION_TAX_INVALID' using errcode = 'P0001'; end if;
    if category in ('STANDARD', 'REDUCED') and coalesce(rate, 0) <= 0 then raise exception 'POSITION_TAX_INVALID' using errcode = 'P0001'; end if;
    if category = 'EXEMPT' and nullif(btrim(item->>'taxExemptionReason'), '') is null then raise exception 'TAX_EXEMPTION_REASON_REQUIRED' using errcode = 'P0001'; end if;
    if (category = 'SMALL_BUSINESS') <> new.is_small_business then raise exception 'SMALL_BUSINESS_TAX_MISMATCH' using errcode = 'P0001'; end if;
  end loop;
  return new;
end; $$;
revoke all on function public.validate_invoice_fiscal_finalization() from public, anon, authenticated;
