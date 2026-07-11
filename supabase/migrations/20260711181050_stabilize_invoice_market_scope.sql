alter table public.invoices
  add column if not exists seller_country text not null default 'DE',
  add column if not exists customer_country text not null default 'DE',
  add column if not exists customer_type text not null default 'BUSINESS',
  add column if not exists service_country text not null default 'DE',
  add column if not exists currency text not null default 'EUR',
  add column if not exists buyer_reference text;

alter table public.user_settings
  add column if not exists seller_tax_number text,
  add column if not exists seller_vat_id text,
  add column if not exists seller_country text not null default 'DE';

update public.user_settings
set seller_tax_number = nullif(btrim(tax_id), '')
where seller_tax_number is null and nullif(btrim(tax_id), '') is not null;

alter table public.invoices drop constraint if exists invoices_service_period_dates_check;
alter table public.invoices add constraint invoices_service_period_dates_check check (
  (service_date is not null and service_period_start is null and service_period_end is null)
  or (service_date is null and service_period_start is not null and service_period_end is not null and service_period_end >= service_period_start)
) not valid;

alter table public.invoices drop constraint if exists invoices_customer_type_check;
alter table public.invoices add constraint invoices_customer_type_check check (customer_type in ('BUSINESS','PRIVATE'));

create or replace function public.validate_invoice_fiscal_finalization()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare item jsonb; category text; rate numeric; settings_row public.user_settings;
begin
  if new.status = 'DRAFT' or (tg_op = 'UPDATE' and old.status is not distinct from new.status) then return new; end if;
  if new.seller_country <> 'DE' or new.customer_country <> 'DE' or new.service_country <> 'DE'
     or new.customer_type <> 'BUSINESS' or new.currency <> 'EUR' then
    raise exception 'UNSUPPORTED_MARKET_SCOPE' using errcode = 'P0001';
  end if;
  if (new.service_date is not null and (new.service_period_start is not null or new.service_period_end is not null))
     or (new.service_date is null and (new.service_period_start is null or new.service_period_end is null)) then
    raise exception 'SERVICE_DATE_REQUIRED' using errcode = 'P0001';
  end if;
  if new.service_period_start is not null and new.service_period_end < new.service_period_start then raise exception 'SERVICE_PERIOD_INVALID' using errcode = 'P0001'; end if;
  select * into settings_row from public.user_settings where user_id = new.user_id;
  if nullif(btrim(settings_row.seller_tax_number), '') is null and nullif(btrim(settings_row.seller_vat_id), '') is null then
    raise exception 'SELLER_TAX_IDENTIFICATION_REQUIRED' using errcode = 'P0001';
  end if;
  if jsonb_typeof(new.positions) <> 'array' or jsonb_array_length(new.positions) = 0 then raise exception 'INVOICE_POSITIONS_REQUIRED' using errcode = 'P0001'; end if;
  for item in select value from jsonb_array_elements(new.positions) loop
    category := item->>'taxCategory'; rate := nullif(item->>'taxRate', '')::numeric;
    if not ((category = 'STANDARD' and rate = 19 and not new.is_small_business)
      or (category = 'REDUCED' and rate = 7 and not new.is_small_business)
      or (category = 'SMALL_BUSINESS' and coalesce(rate, 0) = 0 and new.is_small_business)) then
      raise exception 'UNSUPPORTED_TAX_CASE' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end; $$;

revoke all on function public.validate_invoice_fiscal_finalization() from public, anon, authenticated;

create or replace function public.extend_invoice_branding_tax_snapshot()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare s public.user_settings;
begin
  if new.status <> 'DRAFT' and (old.status = 'DRAFT' or new.branding_snapshot is null) then
    select * into s from public.user_settings where user_id = new.user_id;
    new.branding_snapshot := coalesce(new.branding_snapshot, '{}'::jsonb) || jsonb_build_object(
      'sellerTaxNumber', s.seller_tax_number, 'sellerVatId', s.seller_vat_id, 'sellerCountry', s.seller_country,
      'taxId', coalesce(s.seller_tax_number, s.seller_vat_id, s.tax_id));
  end if;
  return new;
end; $$;
revoke all on function public.extend_invoice_branding_tax_snapshot() from public, anon, authenticated;
drop trigger if exists trg_01_invoice_tax_snapshot on public.invoices;
create trigger trg_01_invoice_tax_snapshot before update of status on public.invoices
for each row execute function public.extend_invoice_branding_tax_snapshot();

create or replace function public.convert_offer_to_invoice(offer_id uuid)
returns public.invoices language plpgsql security definer set search_path = pg_catalog, public as $$
declare uid uuid := auth.uid(); offer_rec public.offers; inv public.invoices;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into offer_rec from public.offers where id = offer_id for update;
  if not found then raise exception 'Offer not found'; end if;
  if offer_rec.user_id <> uid then raise exception 'FORBIDDEN'; end if;
  if offer_rec.status not in ('SENT','ACCEPTED') then raise exception 'Offer status transition not allowed'; end if;
  insert into public.invoices (user_id,offer_id,client_id,project_id,date,invoice_date,service_date,due_date,positions,vat_rate,intro_text,footer_text,status,number,is_locked,currency,seller_country,customer_country,customer_type,service_country)
  values (uid,offer_rec.id,offer_rec.client_id,offer_rec.project_id,current_date,current_date,current_date,current_date + 14,offer_rec.positions,offer_rec.vat_rate,offer_rec.intro_text,offer_rec.footer_text,'DRAFT',null,false,coalesce(offer_rec.currency,'EUR'),'DE','DE','BUSINESS','DE') returning * into inv;
  perform public.copy_customer_snapshot_to_invoice(inv.id);
  update public.offers set status='INVOICED',invoice_id=inv.id,updated_at=now() where id=offer_rec.id;
  insert into public.document_activity(user_id,doc_type,doc_id,event_type,meta) values(uid,'offer',offer_rec.id,'CONVERTED',jsonb_build_object('invoice_id',inv.id)),(uid,'invoice',inv.id,'CREATED','{}'::jsonb);
  return inv;
end; $$;
revoke all on function public.convert_offer_to_invoice(uuid) from public, anon;
grant execute on function public.convert_offer_to_invoice(uuid) to authenticated;
