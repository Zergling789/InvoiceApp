create or replace function public.mark_offer_sent(doc_id uuid, p_user_id uuid, p_to text, p_via text)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.offers;
begin
  if doc_id is null or p_user_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into rec
  from public.offers
  where id = doc_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Offer not found';
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
      and user_id = p_user_id
    returning * into rec;
  else
    update public.offers
    set sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
      and user_id = p_user_id
    returning * into rec;
  end if;

  return rec;
end;
$$;

create or replace function public.mark_invoice_sent(doc_id uuid, p_user_id uuid, p_to text, p_via text)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.invoices;
begin
  if doc_id is null or p_user_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into rec
  from public.invoices
  where id = doc_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Invoice not found';
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
      and user_id = p_user_id
    returning * into rec;
  else
    update public.invoices
    set sent_count = coalesce(rec.sent_count, 0) + 1,
        last_sent_at = now(),
        last_sent_to = p_to,
        sent_via = p_via,
        updated_at = now()
    where id = doc_id
      and user_id = p_user_id
    returning * into rec;
  end if;

  return rec;
end;
$$;
