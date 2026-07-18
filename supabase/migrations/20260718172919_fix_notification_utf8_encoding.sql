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

-- The read-state trigger intentionally blocks every update except the one-way
-- unread-to-read transition. Recreate it around this bounded maintenance update
-- so existing rows keep their original read state and timestamp.
drop trigger if exists notifications_guard_read_transition on public.notifications;

update public.notifications
set title = replace(
      replace(title, 'Angebot geÃ¶ffnet', 'Angebot geöffnet'),
      'Rechnung geÃ¶ffnet', 'Rechnung geöffnet'
    ),
    message = replace(message, 'vom Kunden geÃ¶ffnet.', 'vom Kunden geöffnet.')
where type in ('offer_viewed', 'invoice_viewed')
  and (
    title like '%geÃ¶ffnet%'
    or message like '%geÃ¶ffnet%'
  );

create trigger notifications_guard_read_transition
before update on public.notifications
for each row
execute function public.guard_notification_read_transition();
