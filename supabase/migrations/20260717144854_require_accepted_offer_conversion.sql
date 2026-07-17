create or replace function public.convert_offer_to_invoice(offer_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  offer_rec public.offers;
  inv public.invoices;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  if offer_id is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  select * into offer_rec
  from public.offers
  where id = offer_id
    and user_id = uid
  for update;

  if not found then
    raise exception 'OFFER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if offer_rec.invoice_id is not null or offer_rec.status = 'INVOICED' then
    raise exception 'OFFER_ALREADY_CONVERTED' using errcode = 'P0001';
  end if;
  if offer_rec.status <> 'ACCEPTED' then
    raise exception 'OFFER_NOT_ACCEPTED' using errcode = 'P0001';
  end if;

  insert into public.invoices (
    user_id,
    offer_id,
    client_id,
    project_id,
    date,
    invoice_date,
    service_date,
    due_date,
    positions,
    vat_rate,
    intro_text,
    footer_text,
    status,
    number,
    is_locked,
    currency,
    seller_country,
    customer_country,
    customer_type,
    service_country
  )
  values (
    uid,
    offer_rec.id,
    offer_rec.client_id,
    offer_rec.project_id,
    current_date,
    current_date,
    current_date,
    current_date + 14,
    offer_rec.positions,
    offer_rec.vat_rate,
    offer_rec.intro_text,
    offer_rec.footer_text,
    'DRAFT',
    null,
    false,
    coalesce(offer_rec.currency, 'EUR'),
    'DE',
    'DE',
    'BUSINESS',
    'DE'
  )
  returning * into inv;

  perform public.copy_customer_snapshot_to_invoice(inv.id);

  update public.offers
  set status = 'INVOICED',
      invoice_id = inv.id,
      updated_at = now()
  where id = offer_rec.id
    and user_id = uid;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values
    (uid, 'offer', offer_rec.id, 'CONVERTED', jsonb_build_object('invoice_id', inv.id)),
    (uid, 'invoice', inv.id, 'CREATED', '{}'::jsonb);

  return inv;
end;
$$;

revoke all on function public.convert_offer_to_invoice(uuid) from public, anon;
grant execute on function public.convert_offer_to_invoice(uuid) to authenticated;
