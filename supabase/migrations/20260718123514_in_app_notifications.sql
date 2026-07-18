create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'offer_accepted',
    'offer_rejected',
    'offer_viewed',
    'offer_message_received',
    'offer_expiring',
    'invoice_viewed',
    'invoice_paid',
    'invoice_overdue',
    'payment_failed',
    'document_send_failed',
    'system'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  entity_type text null check (entity_type is null or entity_type in ('offer', 'invoice', 'system')),
  entity_id uuid null,
  action_url text null check (
    action_url is null
    or (
      char_length(action_url) <= 500
      and action_url ~ '^/app(?:/|$)[A-Za-z0-9_/?=&%.-]*$'
    )
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  event_key text null check (event_key is null or char_length(event_key) between 1 and 200),
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint notifications_read_state_check check (
    (is_read = false and read_at is null)
    or (is_read = true and read_at is not null)
  )
);

create index if not exists notifications_user_idx
  on public.notifications (user_id);
create index if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc, id desc);
create index if not exists notifications_entity_idx
  on public.notifications (entity_type, entity_id);
create unique index if not exists notifications_event_key_unique_idx
  on public.notifications (user_id, event_key)
  where event_key is not null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.notifications from public, anon, authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (is_read, read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

create schema if not exists private;

create or replace function private.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_url text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_event_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_id uuid;
  normalized_title text := btrim(p_title);
  normalized_message text := btrim(p_message);
  normalized_event_key text := nullif(btrim(p_event_key), '');
begin
  if p_user_id is null or not exists (
    select 1 from auth.users u where u.id = p_user_id
  ) then
    raise exception 'NOTIFICATION_USER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_type is null or p_type <> all (array[
    'offer_accepted',
    'offer_rejected',
    'offer_viewed',
    'offer_message_received',
    'offer_expiring',
    'invoice_viewed',
    'invoice_paid',
    'invoice_overdue',
    'payment_failed',
    'document_send_failed',
    'system'
  ]) then
    raise exception 'NOTIFICATION_TYPE_INVALID' using errcode = 'P0001';
  end if;

  if char_length(normalized_title) not between 1 and 160
    or char_length(normalized_message) not between 1 and 1000 then
    raise exception 'NOTIFICATION_CONTENT_INVALID' using errcode = 'P0001';
  end if;

  if p_entity_type is not null and p_entity_type not in ('offer', 'invoice', 'system') then
    raise exception 'NOTIFICATION_ENTITY_INVALID' using errcode = 'P0001';
  end if;

  if p_action_url is not null and (
    char_length(p_action_url) > 500
    or p_action_url !~ '^/app(?:/|$)[A-Za-z0-9_/?=&%.-]*$'
  ) then
    raise exception 'NOTIFICATION_ACTION_URL_INVALID' using errcode = 'P0001';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'NOTIFICATION_METADATA_INVALID' using errcode = 'P0001';
  end if;

  if normalized_event_key is not null and char_length(normalized_event_key) > 200 then
    raise exception 'NOTIFICATION_EVENT_KEY_INVALID' using errcode = 'P0001';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    action_url,
    metadata,
    event_key
  )
  values (
    p_user_id,
    p_type,
    normalized_title,
    normalized_message,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_metadata,
    normalized_event_key
  )
  on conflict (user_id, event_key) where event_key is not null do nothing
  returning id into notification_id;

  if notification_id is null and normalized_event_key is not null then
    select n.id
    into notification_id
    from public.notifications n
    where n.user_id = p_user_id
      and n.event_key = normalized_event_key;
  end if;

  if notification_id is null then
    raise exception 'NOTIFICATION_CREATE_FAILED' using errcode = 'P0001';
  end if;

  return notification_id;
end;
$$;

revoke all on function private.create_notification(uuid, text, text, text, text, uuid, text, jsonb, text)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.create_notification(uuid, text, text, text, text, uuid, text, jsonb, text)
  to service_role;

create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_url text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_event_key text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_notification(
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_metadata,
    p_event_key
  );
$$;

revoke all on function public.create_notification(uuid, text, text, text, text, uuid, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.create_notification(uuid, text, text, text, text, uuid, text, jsonb, text)
  to service_role;

alter table public.document_recipient_links
  add column if not exists first_viewed_at timestamptz null;

create or replace function public.record_recipient_document_view(p_link_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  link_rec public.document_recipient_links;
  document_number text;
  notification_type text;
  notification_title text;
  action_url text;
begin
  select *
  into link_rec
  from public.document_recipient_links
  where id = p_link_id
  for update;

  if not found
    or link_rec.revoked_at is not null
    or link_rec.expires_at <= now() then
    raise exception 'LINK_NOT_FOUND' using errcode = 'P0001';
  end if;

  if link_rec.first_viewed_at is not null then
    return false;
  end if;

  if link_rec.document_type = 'offer' then
    select o.number
    into document_number
    from public.offers o
    where o.id = link_rec.document_id
      and o.user_id = link_rec.user_id;
    notification_type := 'offer_viewed';
    notification_title := 'Angebot geöffnet';
    action_url := '/app/offers/' || link_rec.document_id::text;
  elsif link_rec.document_type = 'invoice' then
    select coalesce(i.invoice_number, i.number, 'Rechnung')
    into document_number
    from public.invoices i
    where i.id = link_rec.document_id
      and i.user_id = link_rec.user_id;
    notification_type := 'invoice_viewed';
    notification_title := 'Rechnung geöffnet';
    action_url := '/app/invoices/' || link_rec.document_id::text;
  else
    raise exception 'DOCUMENT_TYPE_INVALID' using errcode = 'P0001';
  end if;

  if document_number is null then
    raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.document_recipient_links
  set first_viewed_at = now()
  where id = link_rec.id;

  perform private.create_notification(
    link_rec.user_id,
    notification_type,
    notification_title,
    case
      when link_rec.document_type = 'offer'
        then 'Das Angebot ' || document_number || ' wurde vom Kunden geöffnet.'
      else 'Die Rechnung ' || document_number || ' wurde vom Kunden geöffnet.'
    end,
    link_rec.document_type,
    link_rec.document_id,
    action_url,
    jsonb_build_object('source', 'recipient_portal'),
    link_rec.document_type || ':' || link_rec.document_id::text || ':viewed'
  );

  return true;
end;
$$;

revoke all on function public.record_recipient_document_view(uuid)
  from public, anon, authenticated;
grant execute on function public.record_recipient_document_view(uuid)
  to service_role;

create or replace function public.respond_to_offer_link(
  p_link_id uuid,
  p_response text,
  p_rejection_reason text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  link_rec public.document_recipient_links;
  offer_rec public.offers;
  normalized_reason text := nullif(btrim(p_rejection_reason), '');
  customer_name text;
begin
  if p_response not in ('ACCEPTED', 'REJECTED') then
    raise exception 'INVALID_RESPONSE' using errcode = 'P0001';
  end if;
  if normalized_reason is not null and char_length(normalized_reason) > 500 then
    raise exception 'REJECTION_REASON_TOO_LONG' using errcode = 'P0001';
  end if;
  if p_response <> 'REJECTED' then
    normalized_reason := null;
  end if;

  select *
  into link_rec
  from public.document_recipient_links
  where id = p_link_id
  for update;

  if not found or link_rec.document_type <> 'offer' then
    raise exception 'LINK_NOT_FOUND' using errcode = 'P0001';
  end if;
  if link_rec.revoked_at is not null or link_rec.expires_at <= now() then
    raise exception 'LINK_EXPIRED' using errcode = 'P0001';
  end if;
  if link_rec.response is not null then
    return link_rec.response;
  end if;

  select *
  into offer_rec
  from public.offers
  where id = link_rec.document_id
    and user_id = link_rec.user_id
  for update;

  if not found then
    raise exception 'DOCUMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if offer_rec.updated_at is distinct from link_rec.document_updated_at then
    raise exception 'DOCUMENT_CHANGED' using errcode = 'P0001';
  end if;
  if offer_rec.status <> 'SENT' then
    raise exception 'OFFER_NOT_RESPONDABLE' using errcode = 'P0001';
  end if;

  select coalesce(
    nullif(btrim(c.contact_person), ''),
    nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), ''),
    nullif(btrim(c.company_name), ''),
    'dem Kunden'
  )
  into customer_name
  from public.clients c
  where c.id = offer_rec.client_id
    and c.user_id = offer_rec.user_id;

  customer_name := coalesce(customer_name, 'dem Kunden');

  update public.offers
  set status = p_response,
      rejection_reason = normalized_reason
  where id = offer_rec.id;

  update public.document_recipient_links
  set response = p_response,
      response_reason = normalized_reason,
      responded_at = now()
  where id = p_link_id;

  insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
  values (
    link_rec.user_id,
    'offer',
    offer_rec.id,
    lower(p_response),
    jsonb_build_object('source', 'recipient_portal', 'reason', normalized_reason)
  );

  perform private.create_notification(
    link_rec.user_id,
    case when p_response = 'ACCEPTED' then 'offer_accepted' else 'offer_rejected' end,
    case when p_response = 'ACCEPTED' then 'Angebot angenommen' else 'Angebot abgelehnt' end,
    case
      when p_response = 'ACCEPTED'
        then 'Das Angebot ' || offer_rec.number || ' wurde von ' || customer_name || ' angenommen.'
      else 'Das Angebot ' || offer_rec.number || ' wurde abgelehnt.'
    end,
    'offer',
    offer_rec.id,
    '/app/offers/' || offer_rec.id::text,
    jsonb_build_object('source', 'recipient_portal', 'response', lower(p_response)),
    'offer:' || offer_rec.id::text || ':' || lower(p_response)
  );

  return p_response;
end;
$$;

revoke all on function public.respond_to_offer_link(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_offer_link(uuid, text, text)
  to service_role;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
