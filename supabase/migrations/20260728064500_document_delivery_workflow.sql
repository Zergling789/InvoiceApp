create table if not exists public.document_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('offer', 'invoice')),
  document_id uuid not null,
  project_id uuid references public.projects(id) on delete set null,
  recipient text not null,
  cc text,
  bcc text,
  subject text not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed', 'status_unknown', 'cancelled')),
  provider_message_id text,
  error_code text,
  error_message text,
  sent_at timestamptz,
  failed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_deliveries_document_idx
  on public.document_deliveries (organization_id, document_type, document_id, created_at desc);
create index if not exists document_deliveries_project_idx
  on public.document_deliveries (project_id, created_at desc)
  where project_id is not null;

alter table public.document_deliveries enable row level security;

create policy document_deliveries_member_select
  on public.document_deliveries
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = document_deliveries.organization_id
        and member.user_id = (select auth.uid())
    )
  );

revoke all on public.document_deliveries from public, anon;
grant select on public.document_deliveries to authenticated;

create or replace function public.begin_document_delivery(
  p_document_type text,
  p_document_id uuid,
  p_recipient text,
  p_cc text default null,
  p_bcc text default null,
  p_subject text default ''
) returns public.document_deliveries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  org_id uuid;
  linked_project_id uuid;
  result public.document_deliveries;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_document_type not in ('offer', 'invoice') then raise exception 'invalid_document_type'; end if;
  if nullif(btrim(p_recipient), '') is null then raise exception 'recipient_required'; end if;

  if p_document_type = 'invoice' then
    select invoice.organization_id, invoice.project_id
      into org_id, linked_project_id
    from public.invoices invoice
    where invoice.id = p_document_id
      and exists (
        select 1 from public.organization_members member
        where member.organization_id = invoice.organization_id
          and member.user_id = uid
      );
  else
    select offer.organization_id, offer.project_id
      into org_id, linked_project_id
    from public.offers offer
    where offer.id = p_document_id
      and exists (
        select 1 from public.organization_members member
        where member.organization_id = offer.organization_id
          and member.user_id = uid
      );
  end if;

  if org_id is null then raise exception 'document_not_found'; end if;

  insert into public.document_deliveries (
    organization_id, document_type, document_id, project_id,
    recipient, cc, bcc, subject, status, created_by
  ) values (
    org_id, p_document_type, p_document_id, linked_project_id,
    btrim(p_recipient), nullif(btrim(p_cc), ''), nullif(btrim(p_bcc), ''),
    btrim(p_subject), 'processing', uid
  ) returning * into result;

  return result;
end;
$$;

create or replace function public.complete_document_delivery(
  p_delivery_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_error_message text default null
) returns public.document_deliveries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  delivery public.document_deliveries;
  document_number text;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_status not in ('sent', 'failed', 'status_unknown', 'cancelled') then
    raise exception 'invalid_delivery_status';
  end if;

  update public.document_deliveries item set
    status = p_status,
    provider_message_id = nullif(p_provider_message_id, ''),
    error_code = nullif(p_error_code, ''),
    error_message = nullif(p_error_message, ''),
    sent_at = case when p_status = 'sent' then now() else item.sent_at end,
    failed_at = case when p_status in ('failed', 'status_unknown') then now() else item.failed_at end,
    updated_at = now()
  where item.id = p_delivery_id
    and exists (
      select 1 from public.organization_members member
      where member.organization_id = item.organization_id
        and member.user_id = uid
    )
  returning * into delivery;

  if delivery.id is null then raise exception 'delivery_not_found'; end if;

  if p_status = 'sent' and delivery.project_id is not null then
    if delivery.document_type = 'invoice' then
      select invoice.number into document_number
      from public.invoices invoice where invoice.id = delivery.document_id;
    else
      select offer.number into document_number
      from public.offers offer where offer.id = delivery.document_id;
    end if;

    insert into public.project_activities (
      organization_id, project_id, activity_type, title, description,
      entity_type, entity_id, event_key, metadata, created_by
    ) values (
      delivery.organization_id,
      delivery.project_id,
      'document_sent',
      case when delivery.document_type = 'invoice' then 'Rechnung versendet' else 'Angebot versendet' end,
      concat(
        case when delivery.document_type = 'invoice' then 'Rechnung ' else 'Angebot ' end,
        coalesce(document_number, 'ohne Nummer'),
        ' wurde an ', delivery.recipient, ' gesendet.'
      ),
      delivery.document_type,
      delivery.document_id,
      'document_delivery:' || delivery.id::text || ':sent',
      jsonb_build_object(
        'deliveryId', delivery.id,
        'recipient', delivery.recipient,
        'subject', delivery.subject,
        'sentAt', delivery.sent_at
      ),
      uid
    ) on conflict (organization_id, event_key) where event_key is not null do nothing;

    update public.projects project set
      last_activity_at = greatest(coalesce(project.last_activity_at, delivery.sent_at), delivery.sent_at),
      updated_at = now()
    where project.id = delivery.project_id;
  end if;

  return delivery;
end;
$$;

revoke all on function public.begin_document_delivery(text, uuid, text, text, text, text) from public, anon;
revoke all on function public.complete_document_delivery(uuid, text, text, text, text) from public, anon;
grant execute on function public.begin_document_delivery(text, uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.complete_document_delivery(uuid, text, text, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
