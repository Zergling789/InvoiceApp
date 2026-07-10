create or replace function public.convert_offer_to_invoice(offer_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  offer_rec public.offers;
  inv public.invoices;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if offer_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into offer_rec
  from public.offers
  where id = offer_id
  for update;

  if not found then
    raise exception 'Offer not found';
  end if;
  if offer_rec.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;
  if offer_rec.status not in ('SENT', 'ACCEPTED') then
    raise exception 'Offer status transition not allowed';
  end if;

  insert into public.invoices (
    user_id,
    offer_id,
    client_id,
    project_id,
    date,
    due_date,
    positions,
    vat_rate,
    intro_text,
    footer_text,
    status,
    number,
    is_locked,
    updated_at
  )
  values (
    uid,
    offer_rec.id,
    offer_rec.client_id,
    offer_rec.project_id,
    offer_rec.date,
    offer_rec.valid_until,
    offer_rec.positions,
    offer_rec.vat_rate,
    offer_rec.intro_text,
    offer_rec.footer_text,
    'DRAFT',
    null,
    false,
    now()
  )
  returning * into inv;

  update public.offers
  set status = 'INVOICED',
      invoice_id = inv.id,
      updated_at = now()
  where id = offer_rec.id;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (
    uid,
    'offer',
    offer_rec.id,
    'CONVERTED',
    jsonb_build_object('invoice_id', inv.id)
  );

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (uid, 'invoice', inv.id, 'CREATED', '{}'::jsonb);

  return inv;
end;
$$;
