create or replace function public.record_offer_decision(offer_id uuid, decision text)
returns public.offers
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  normalized_decision text := upper(btrim(coalesce(decision, '')));
  offer_rec public.offers;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  if offer_id is null or normalized_decision not in ('ACCEPTED', 'REJECTED') then
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
  if offer_rec.status <> 'SENT' then
    raise exception 'OFFER_NOT_RESPONDABLE' using errcode = 'P0001';
  end if;

  update public.offers
  set status = normalized_decision,
      rejection_reason = case when normalized_decision = 'REJECTED' then rejection_reason else null end,
      updated_at = now()
  where id = offer_rec.id
    and user_id = uid
  returning * into offer_rec;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (uid, 'offer', offer_rec.id, normalized_decision, jsonb_build_object('source', 'MANUAL'));

  return offer_rec;
end;
$$;

revoke all on function public.record_offer_decision(uuid, text) from public, anon;
grant execute on function public.record_offer_decision(uuid, text) to authenticated;
