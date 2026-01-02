create or replace function public.finalize_invoice(invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.invoices;
  next_num bigint;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if invoice_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into inv
  from public.invoices
  where id = invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;
  if inv.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;

  if inv.status = 'ISSUED' then
    return inv;
  end if;

  if inv.status <> 'DRAFT' then
    raise exception 'Invoice status transition not allowed';
  end if;

  next_num := public.next_document_number('invoice');

  update public.invoices
  set number = case
        when inv.number is null or btrim(inv.number) = '' then next_num::text
        else inv.number
      end,
      status = 'ISSUED',
      is_locked = true,
      finalized_at = now(),
      updated_at = now()
  where id = invoice_id
  returning * into inv;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (uid, 'invoice', invoice_id, 'FINALIZED', '{}'::jsonb);

  return inv;
end;
$$;

create or replace function public.mark_offer_sent(doc_id uuid, p_to text, p_via text)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.offers;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if doc_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into rec
  from public.offers
  where id = doc_id
  for update;

  if not found then
    raise exception 'Offer not found';
  end if;
  if rec.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;

  if rec.status = 'DRAFT' then
    update public.offers
    set status = 'SENT',
        sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  else
    update public.offers
    set sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  end if;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (
    uid,
    'offer',
    doc_id,
    'SENT',
    jsonb_build_object('to', p_to, 'via', p_via)
  );

  return rec;
end;
$$;

create or replace function public.mark_invoice_sent(doc_id uuid, p_to text, p_via text)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.invoices;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if doc_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into rec
  from public.invoices
  where id = doc_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;
  if rec.user_id <> uid then
    raise exception 'FORBIDDEN';
  end if;

  if rec.status = 'ISSUED' then
    update public.invoices
    set status = 'SENT',
        sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  else
    update public.invoices
    set sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
    returning * into rec;
  end if;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (
    uid,
    'invoice',
    doc_id,
    'SENT',
    jsonb_build_object('to', p_to, 'via', p_via)
  );

  return rec;
end;
$$;
