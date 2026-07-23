-- Calendar reads stay RLS-protected. Mutations are validated and atomically
-- recorded through the functions below.
drop policy if exists project_appointments_member_all on public.project_appointments;
drop policy if exists project_appointments_member_select on public.project_appointments;

create policy project_appointments_member_select
on public.project_appointments
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = project_appointments.organization_id
      and membership.user_id = (select auth.uid())
  )
);

revoke all privileges on table public.project_appointments from authenticated;
grant select on table public.project_appointments to authenticated;
grant select, insert, update, delete on table public.project_appointments to service_role;

create index if not exists project_appointments_calendar_idx
  on public.project_appointments (organization_id, starts_at, ends_at);

create or replace function public.create_project_appointment(
  p_project_id uuid,
  p_appointment jsonb
)
returns public.project_appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_project public.projects;
  inserted_appointment public.project_appointments;
  appointment_title text;
  appointment_starts_at timestamptz;
  appointment_ends_at timestamptz;
  appointment_type_value text;
  appointment_location text;
  appointment_note text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if p_project_id is null
    or p_appointment is null
    or jsonb_typeof(p_appointment) <> 'object' then
    raise exception 'invalid_project_appointment';
  end if;

  select project.*
  into current_project
  from public.projects project
  where project.id = p_project_id;

  if not found then
    raise exception 'project_not_found';
  end if;
  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = current_project.organization_id
      and membership.user_id = uid
  ) then
    raise exception 'organization_access_denied';
  end if;

  appointment_title := btrim(coalesce(p_appointment->>'title', ''));
  appointment_starts_at := nullif(p_appointment->>'startsAt', '')::timestamptz;
  appointment_ends_at := nullif(p_appointment->>'endsAt', '')::timestamptz;
  appointment_type_value := coalesce(nullif(p_appointment->>'appointmentType', ''), 'other');
  appointment_location := nullif(btrim(coalesce(p_appointment->>'location', '')), '');
  appointment_note := nullif(btrim(coalesce(p_appointment->>'note', '')), '');

  if char_length(appointment_title) not between 1 and 240 then
    raise exception 'invalid_appointment_title';
  end if;
  if appointment_starts_at is null
    or appointment_ends_at is null
    or appointment_ends_at <= appointment_starts_at
    or appointment_ends_at > appointment_starts_at + interval '31 days' then
    raise exception 'invalid_appointment_period';
  end if;
  if appointment_type_value not in (
    'site_visit', 'project_start', 'work_day', 'delivery', 'inspection',
    'handover', 'follow_up', 'other'
  ) then
    raise exception 'invalid_appointment_type';
  end if;
  if appointment_location is not null and char_length(appointment_location) > 500 then
    raise exception 'invalid_appointment_location';
  end if;
  if appointment_note is not null and char_length(appointment_note) > 5000 then
    raise exception 'invalid_appointment_note';
  end if;

  insert into public.project_appointments (
    organization_id,
    project_id,
    customer_id,
    title,
    starts_at,
    ends_at,
    appointment_type,
    location,
    note,
    created_by
  )
  values (
    current_project.organization_id,
    current_project.id,
    current_project.client_id,
    appointment_title,
    appointment_starts_at,
    appointment_ends_at,
    appointment_type_value,
    appointment_location,
    appointment_note,
    uid
  )
  returning * into inserted_appointment;

  insert into public.project_activities (
    organization_id,
    project_id,
    activity_type,
    title,
    entity_type,
    entity_id,
    metadata,
    event_key,
    created_by
  )
  values (
    current_project.organization_id,
    current_project.id,
    'appointment_created',
    'Termin wurde erstellt',
    'appointment',
    inserted_appointment.id,
    jsonb_build_object(
      'appointmentTitle', inserted_appointment.title,
      'startsAt', inserted_appointment.starts_at
    ),
    'appointment:' || inserted_appointment.id::text || ':created',
    uid
  )
  on conflict (organization_id, event_key) where event_key is not null do nothing;

  return inserted_appointment;
end;
$$;

revoke all on function public.create_project_appointment(uuid, jsonb) from public, anon;
grant execute on function public.create_project_appointment(uuid, jsonb)
  to authenticated, service_role;

create or replace function public.update_project_appointment(
  p_appointment_id uuid,
  p_patch jsonb
)
returns public.project_appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_appointment public.project_appointments;
  updated_appointment public.project_appointments;
  next_title text;
  next_starts_at timestamptz;
  next_ends_at timestamptz;
  next_type text;
  next_location text;
  next_note text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if p_appointment_id is null
    or p_patch is null
    or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_project_appointment_patch';
  end if;

  select appointment.*
  into current_appointment
  from public.project_appointments appointment
  where appointment.id = p_appointment_id
  for update;

  if not found then
    raise exception 'project_appointment_not_found';
  end if;
  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = current_appointment.organization_id
      and membership.user_id = uid
  ) then
    raise exception 'organization_access_denied';
  end if;

  next_title := case
    when p_patch ? 'title' then btrim(coalesce(p_patch->>'title', ''))
    else current_appointment.title
  end;
  next_starts_at := case
    when p_patch ? 'startsAt' then nullif(p_patch->>'startsAt', '')::timestamptz
    else current_appointment.starts_at
  end;
  next_ends_at := case
    when p_patch ? 'endsAt' then nullif(p_patch->>'endsAt', '')::timestamptz
    else current_appointment.ends_at
  end;
  next_type := case
    when p_patch ? 'appointmentType' then p_patch->>'appointmentType'
    else current_appointment.appointment_type
  end;
  next_location := case
    when p_patch ? 'location' then nullif(btrim(coalesce(p_patch->>'location', '')), '')
    else current_appointment.location
  end;
  next_note := case
    when p_patch ? 'note' then nullif(btrim(coalesce(p_patch->>'note', '')), '')
    else current_appointment.note
  end;

  if char_length(next_title) not between 1 and 240 then
    raise exception 'invalid_appointment_title';
  end if;
  if next_starts_at is null
    or next_ends_at is null
    or next_ends_at <= next_starts_at
    or next_ends_at > next_starts_at + interval '31 days' then
    raise exception 'invalid_appointment_period';
  end if;
  if next_type not in (
    'site_visit', 'project_start', 'work_day', 'delivery', 'inspection',
    'handover', 'follow_up', 'other'
  ) then
    raise exception 'invalid_appointment_type';
  end if;
  if next_location is not null and char_length(next_location) > 500 then
    raise exception 'invalid_appointment_location';
  end if;
  if next_note is not null and char_length(next_note) > 5000 then
    raise exception 'invalid_appointment_note';
  end if;

  update public.project_appointments appointment
  set
    title = next_title,
    starts_at = next_starts_at,
    ends_at = next_ends_at,
    appointment_type = next_type,
    location = next_location,
    note = next_note,
    updated_at = now()
  where appointment.id = current_appointment.id
  returning * into updated_appointment;

  if updated_appointment.project_id is not null then
    insert into public.project_activities (
      organization_id,
      project_id,
      activity_type,
      title,
      entity_type,
      entity_id,
      metadata,
      created_by
    )
    values (
      updated_appointment.organization_id,
      updated_appointment.project_id,
      'project_updated',
      'Termin wurde aktualisiert',
      'appointment',
      updated_appointment.id,
      jsonb_build_object(
        'appointmentTitle', updated_appointment.title,
        'startsAt', updated_appointment.starts_at
      ),
      uid
    );
  end if;

  return updated_appointment;
end;
$$;

revoke all on function public.update_project_appointment(uuid, jsonb) from public, anon;
grant execute on function public.update_project_appointment(uuid, jsonb)
  to authenticated, service_role;
