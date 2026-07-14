alter table public.document_recipient_links add column if not exists response_reason text null;
alter table public.offers add column if not exists rejection_reason text null;

do $$ begin
  alter table public.document_recipient_links add constraint document_recipient_links_response_reason_check
    check (response_reason is null or (response = 'REJECTED' and char_length(response_reason) between 1 and 500));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.offers add constraint offers_rejection_reason_check
    check (rejection_reason is null or (status = 'REJECTED' and char_length(rejection_reason) between 1 and 500));
exception when duplicate_object then null; end $$;

drop function if exists public.respond_to_offer_link(uuid, text);

create function public.respond_to_offer_link(p_link_id uuid, p_response text, p_rejection_reason text default null)
returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  link_rec public.document_recipient_links;
  offer_rec public.offers;
  normalized_reason text := nullif(btrim(p_rejection_reason), '');
begin
  if p_response not in ('ACCEPTED','REJECTED') then raise exception 'INVALID_RESPONSE'; end if;
  if normalized_reason is not null and char_length(normalized_reason) > 500 then raise exception 'REJECTION_REASON_TOO_LONG'; end if;
  if p_response <> 'REJECTED' then normalized_reason := null; end if;
  select * into link_rec from public.document_recipient_links where id=p_link_id for update;
  if not found or link_rec.document_type <> 'offer' then raise exception 'LINK_NOT_FOUND'; end if;
  if link_rec.revoked_at is not null or link_rec.expires_at <= now() then raise exception 'LINK_EXPIRED'; end if;
  if link_rec.response is not null then return link_rec.response; end if;
  select * into offer_rec from public.offers where id=link_rec.document_id and user_id=link_rec.user_id for update;
  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  if offer_rec.updated_at is distinct from link_rec.document_updated_at then raise exception 'DOCUMENT_CHANGED'; end if;
  if offer_rec.status <> 'SENT' then raise exception 'OFFER_NOT_RESPONDABLE'; end if;
  update public.offers set status=p_response, rejection_reason=normalized_reason where id=offer_rec.id;
  update public.document_recipient_links set response=p_response, response_reason=normalized_reason, responded_at=now() where id=p_link_id;
  insert into public.document_activity(user_id,doc_type,doc_id,event_type,meta)
  values(link_rec.user_id,'offer',offer_rec.id,lower(p_response),jsonb_build_object('source','recipient_portal','reason',normalized_reason));
  return p_response;
end;
$$;

revoke all on function public.respond_to_offer_link(uuid,text,text) from public, anon, authenticated;
grant execute on function public.respond_to_offer_link(uuid,text,text) to service_role;
