alter table public.user_settings
  add column if not exists seller_street text,
  add column if not exists seller_house_number text,
  add column if not exists seller_postal_code text,
  add column if not exists seller_city text,
  add column if not exists seller_electronic_address text,
  add column if not exists seller_electronic_address_scheme text not null default 'EM';

alter table public.invoices
  add column if not exists client_street text,
  add column if not exists client_house_number text,
  add column if not exists client_postal_code text,
  add column if not exists client_city text,
  add column if not exists client_electronic_address text,
  add column if not exists client_electronic_address_scheme text;

create or replace function public.copy_customer_snapshot_to_invoice(p_invoice_id uuid)
returns public.invoices language plpgsql security definer set search_path = pg_catalog, public as $$
declare uid uuid := auth.uid(); inv public.invoices; client_rec public.clients; resolved_name text;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into inv from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.user_id <> uid then raise exception 'FORBIDDEN'; end if;
  if inv.client_id is null then raise exception 'CLIENT_REQUIRED'; end if;
  select * into client_rec from public.clients where id=inv.client_id and user_id=uid;
  if not found then raise exception 'Client not found'; end if;
  resolved_name := coalesce(nullif(btrim(client_rec.company_name),''),nullif(btrim(client_rec.contact_person),''),'');
  update public.invoices set client_name=resolved_name,client_company_name=nullif(btrim(client_rec.company_name),''),client_contact_person=nullif(btrim(client_rec.contact_person),''),client_email=nullif(btrim(client_rec.email),''),client_address=nullif(btrim(client_rec.address),''),client_street=nullif(btrim(client_rec.street),''),client_house_number=nullif(btrim(client_rec.house_number),''),client_postal_code=nullif(btrim(client_rec.postal_code),''),client_city=nullif(btrim(client_rec.city),''),client_electronic_address=coalesce(nullif(btrim(client_rec.invoice_email),''),nullif(btrim(client_rec.email),'')),client_electronic_address_scheme='EM',updated_at=now() where id=p_invoice_id returning * into inv;
  return inv;
end; $$;
revoke all on function public.copy_customer_snapshot_to_invoice(uuid) from public, anon;
grant execute on function public.copy_customer_snapshot_to_invoice(uuid) to authenticated;

create or replace function public.extend_invoice_einvoice_party_snapshot()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare s public.user_settings;
begin
  if new.status <> 'DRAFT' and old.status = 'DRAFT' then
    select * into s from public.user_settings where user_id=new.user_id;
    new.branding_snapshot := coalesce(new.branding_snapshot,'{}'::jsonb) || jsonb_build_object(
      'companyName',s.company_name,'address',s.address,'taxId',coalesce(s.seller_tax_number,s.seller_vat_id,s.tax_id),
      'sellerTaxNumber',s.seller_tax_number,'sellerVatId',s.seller_vat_id,'sellerCountry',s.seller_country,
      'sellerStreet',s.seller_street,'sellerHouseNumber',s.seller_house_number,'sellerPostalCode',s.seller_postal_code,'sellerCity',s.seller_city,
      'sellerElectronicAddress',s.seller_electronic_address,'sellerElectronicAddressScheme',s.seller_electronic_address_scheme,
      'iban',s.iban,'bic',s.bic,'bankName',s.bank_name,'footerText',s.footer_text,'logoUrl',s.logo_url,
      'primaryColor',s.primary_color,'templateId',case when s.template_id='default' then 'classic' else s.template_id end,'locale',s.locale,'currency',s.currency
    );
  end if;
  return new;
end; $$;
revoke all on function public.extend_invoice_einvoice_party_snapshot() from public, anon, authenticated;
drop trigger if exists trg_02_invoice_einvoice_party_snapshot on public.invoices;
create trigger trg_02_invoice_einvoice_party_snapshot before update of status on public.invoices for each row execute function public.extend_invoice_einvoice_party_snapshot();
