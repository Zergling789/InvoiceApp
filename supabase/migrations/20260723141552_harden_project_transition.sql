create or replace function public.apply_project_transition(
  p_project_id uuid,
  p_event text,
  p_event_key text default null
)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_project public.projects;
  target_phase text;
  action_label text;
  action_type text;
  action_at timestamptz;
  activity_type text;
  activity_title text;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  select project.* into current_project
  from public.projects project
  where project.id = p_project_id
  for update;
  if not found then raise exception 'project_not_found'; end if;
  if not exists (
    select 1 from public.organization_members membership
    where membership.organization_id = current_project.organization_id
      and membership.user_id = uid
  ) then raise exception 'organization_access_denied'; end if;

  target_phase := case p_event
    when 'QUOTE_CREATED' then 'quote_draft'
    when 'QUOTE_SENT' then 'quote_sent'
    when 'QUOTE_ACCEPTED' then 'accepted'
    when 'QUOTE_REJECTED' then 'lost'
    when 'INVOICE_CREATED' then 'invoiced'
    when 'INVOICE_SENT' then 'payment_pending'
    else null
  end;
  activity_type := case p_event
    when 'QUOTE_CREATED' then 'quote_created'
    when 'QUOTE_SENT' then 'quote_sent'
    when 'QUOTE_ACCEPTED' then 'quote_accepted'
    when 'QUOTE_REJECTED' then 'quote_rejected'
    when 'INVOICE_CREATED' then 'invoice_created'
    when 'INVOICE_SENT' then 'invoice_sent'
    when 'INVOICE_PAID' then 'invoice_paid'
    else null
  end;
  activity_title := case p_event
    when 'QUOTE_CREATED' then 'Angebot wurde erstellt'
    when 'QUOTE_SENT' then 'Angebot wurde versendet'
    when 'QUOTE_ACCEPTED' then 'Angebot wurde angenommen'
    when 'QUOTE_REJECTED' then 'Angebot wurde abgelehnt'
    when 'INVOICE_CREATED' then 'Rechnung wurde erstellt'
    when 'INVOICE_SENT' then 'Rechnung wurde versendet'
    when 'INVOICE_PAID' then 'Rechnung wurde bezahlt'
    else null
  end;
  action_type := case p_event
    when 'QUOTE_CREATED' then 'finish_quote'
    when 'QUOTE_SENT' then 'follow_up_quote'
    when 'QUOTE_ACCEPTED' then 'schedule_project'
    when 'QUOTE_REJECTED' then 'review_rejection'
    when 'INVOICE_CREATED' then 'send_invoice'
    when 'INVOICE_SENT' then 'monitor_payment'
    when 'INVOICE_PAID' then 'complete_project'
    else current_project.next_action_type
  end;
  action_label := case p_event
    when 'QUOTE_CREATED' then 'Angebot fertigstellen'
    when 'QUOTE_SENT' then 'Kunden nachfassen'
    when 'QUOTE_ACCEPTED' then 'Projekttermin festlegen'
    when 'QUOTE_REJECTED' then U&'Ablehnung pr\00FCfen'
    when 'INVOICE_CREATED' then 'Rechnung versenden'
    when 'INVOICE_SENT' then U&'Zahlung pr\00FCfen'
    when 'INVOICE_PAID' then U&'Projektabschluss best\00E4tigen'
    else current_project.next_action_label
  end;
  action_at := case p_event
    when 'QUOTE_SENT' then now() + interval '7 days'
    when 'INVOICE_SENT' then current_project.next_action_at
    else null
  end;

  if activity_type is null then raise exception 'invalid_project_event'; end if;

  insert into public.project_activities (
    organization_id, project_id, activity_type, title, event_key, created_by
  )
  values (
    current_project.organization_id, current_project.id, activity_type,
    activity_title, p_event_key, uid
  )
  on conflict (organization_id, event_key) where event_key is not null do nothing;

  if p_event_key is not null and not found then
    return current_project;
  end if;

  update public.projects project
  set
    phase = case
      when target_phase is null then project.phase
      when project.phase in ('lost', 'cancelled') then project.phase
      when private.project_phase_rank(target_phase) >= private.project_phase_rank(project.phase)
      then target_phase
      else project.phase
    end,
    next_action_type = action_type,
    next_action_label = action_label,
    next_action_at = action_at,
    updated_at = now()
  where project.id = current_project.id
  returning * into current_project;

  return current_project;
end;
$$;

revoke all on function public.apply_project_transition(uuid, text, text) from public, anon;
grant execute on function public.apply_project_transition(uuid, text, text) to authenticated, service_role;
