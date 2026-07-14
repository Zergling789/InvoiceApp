create table if not exists public.document_recipient_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('offer','invoice')),
  document_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  document_updated_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  responded_at timestamptz,
  response text constraint document_recipient_links_response_value_check check (response in ('ACCEPTED','REJECTED')),
  created_at timestamptz not null default now(),
  constraint document_recipient_links_response_pair_check check ((response is null and responded_at is null) or (response is not null and responded_at is not null))
);

create index if not exists document_recipient_links_owner_idx on public.document_recipient_links(user_id, document_type, document_id);
alter table public.document_recipient_links enable row level security;
drop policy if exists document_recipient_links_select_own on public.document_recipient_links;
create policy document_recipient_links_select_own on public.document_recipient_links for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.document_recipient_links from anon, authenticated;
grant select on table public.document_recipient_links to authenticated;

create or replace function public.respond_to_offer_link(p_link_id uuid, p_response text)
returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare link_rec public.document_recipient_links; offer_rec public.offers;
begin
  if p_response not in ('ACCEPTED','REJECTED') then raise exception 'INVALID_RESPONSE'; end if;
  select * into link_rec from public.document_recipient_links where id=p_link_id for update;
  if not found or link_rec.document_type <> 'offer' then raise exception 'LINK_NOT_FOUND'; end if;
  if link_rec.revoked_at is not null or link_rec.expires_at <= now() then raise exception 'LINK_EXPIRED'; end if;
  if link_rec.response is not null then return link_rec.response; end if;
  select * into offer_rec from public.offers where id=link_rec.document_id and user_id=link_rec.user_id for update;
  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  if offer_rec.updated_at is distinct from link_rec.document_updated_at then raise exception 'DOCUMENT_CHANGED'; end if;
  if offer_rec.status <> 'SENT' then raise exception 'OFFER_NOT_RESPONDABLE'; end if;
  update public.offers set status=p_response where id=offer_rec.id;
  update public.document_recipient_links set response=p_response, responded_at=now() where id=p_link_id;
  insert into public.document_activity(user_id,doc_type,doc_id,event_type,meta)
  values(link_rec.user_id,'offer',offer_rec.id,lower(p_response),jsonb_build_object('source','recipient_portal'));
  return p_response;
end;
$$;
revoke all on function public.respond_to_offer_link(uuid,text) from public, anon, authenticated;
grant execute on function public.respond_to_offer_link(uuid,text) to service_role;
