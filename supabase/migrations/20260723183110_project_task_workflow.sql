-- Project tasks are readable through RLS, but all mutations go through the
-- validated functions below. This keeps organization and activity data in one
-- transaction and prevents clients from forging created_by/organization_id.
drop policy if exists project_tasks_member_all on public.project_tasks;
drop policy if exists project_tasks_member_select on public.project_tasks;

create policy project_tasks_member_select
on public.project_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = project_tasks.organization_id
      and membership.user_id = (select auth.uid())
  )
);

revoke insert, update, delete on public.project_tasks from authenticated;
grant select on public.project_tasks to authenticated;
grant select, insert, update, delete on public.project_tasks to service_role;

create or replace function public.create_project_task(
  p_project_id uuid,
  p_task jsonb
)
returns public.project_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_project public.projects;
  inserted_task public.project_tasks;
  task_title text;
  task_description text;
  task_priority text;
  task_due_at timestamptz;
  task_assignee uuid;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if p_project_id is null or p_task is null or jsonb_typeof(p_task) <> 'object' then
    raise exception 'invalid_project_task';
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

  task_title := btrim(coalesce(p_task->>'title', ''));
  task_description := nullif(btrim(coalesce(p_task->>'description', '')), '');
  task_priority := coalesce(nullif(p_task->>'priority', ''), 'normal');
  task_due_at := nullif(p_task->>'dueAt', '')::timestamptz;
  task_assignee := nullif(p_task->>'assignedUserId', '')::uuid;

  if char_length(task_title) not between 1 and 240 then
    raise exception 'invalid_task_title';
  end if;
  if task_description is not null and char_length(task_description) > 5000 then
    raise exception 'invalid_task_description';
  end if;
  if task_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'invalid_task_priority';
  end if;
  if task_assignee is not null and not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = current_project.organization_id
      and membership.user_id = task_assignee
  ) then
    raise exception 'invalid_task_assignee';
  end if;

  insert into public.project_tasks (
    organization_id,
    project_id,
    customer_id,
    title,
    description,
    status,
    priority,
    due_at,
    assigned_user_id,
    created_by
  )
  values (
    current_project.organization_id,
    current_project.id,
    current_project.client_id,
    task_title,
    task_description,
    'open',
    task_priority,
    task_due_at,
    task_assignee,
    uid
  )
  returning * into inserted_task;

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
    'task_created',
    'Aufgabe wurde erstellt',
    'task',
    inserted_task.id,
    jsonb_build_object('taskTitle', inserted_task.title),
    'task:' || inserted_task.id::text || ':created',
    uid
  )
  on conflict (organization_id, event_key) where event_key is not null do nothing;

  return inserted_task;
end;
$$;

revoke all on function public.create_project_task(uuid, jsonb) from public, anon;
grant execute on function public.create_project_task(uuid, jsonb) to authenticated, service_role;

create or replace function public.update_project_task(
  p_task_id uuid,
  p_patch jsonb
)
returns public.project_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_task public.project_tasks;
  updated_task public.project_tasks;
  next_title text;
  next_description text;
  next_status text;
  next_priority text;
  next_due_at timestamptz;
  next_assignee uuid;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if p_task_id is null or p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_project_task_patch';
  end if;

  select task.*
  into current_task
  from public.project_tasks task
  where task.id = p_task_id
  for update;

  if not found then
    raise exception 'project_task_not_found';
  end if;
  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = current_task.organization_id
      and membership.user_id = uid
  ) then
    raise exception 'organization_access_denied';
  end if;

  next_title := case
    when p_patch ? 'title' then btrim(coalesce(p_patch->>'title', ''))
    else current_task.title
  end;
  next_description := case
    when p_patch ? 'description' then nullif(btrim(coalesce(p_patch->>'description', '')), '')
    else current_task.description
  end;
  next_status := case
    when p_patch ? 'status' then p_patch->>'status'
    else current_task.status
  end;
  next_priority := case
    when p_patch ? 'priority' then p_patch->>'priority'
    else current_task.priority
  end;
  next_due_at := case
    when p_patch ? 'dueAt' then nullif(p_patch->>'dueAt', '')::timestamptz
    else current_task.due_at
  end;
  next_assignee := case
    when p_patch ? 'assignedUserId' then nullif(p_patch->>'assignedUserId', '')::uuid
    else current_task.assigned_user_id
  end;

  if char_length(next_title) not between 1 and 240 then
    raise exception 'invalid_task_title';
  end if;
  if next_description is not null and char_length(next_description) > 5000 then
    raise exception 'invalid_task_description';
  end if;
  if next_status not in ('open', 'in_progress', 'completed', 'cancelled') then
    raise exception 'invalid_task_status';
  end if;
  if next_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'invalid_task_priority';
  end if;
  if next_assignee is not null and not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = current_task.organization_id
      and membership.user_id = next_assignee
  ) then
    raise exception 'invalid_task_assignee';
  end if;

  update public.project_tasks task
  set
    title = next_title,
    description = next_description,
    status = next_status,
    priority = next_priority,
    due_at = next_due_at,
    assigned_user_id = next_assignee,
    completed_at = case
      when next_status = 'completed' and task.status <> 'completed' then now()
      when next_status <> 'completed' then null
      else task.completed_at
    end,
    updated_at = now()
  where task.id = current_task.id
  returning * into updated_task;

  if current_task.status <> 'completed' and updated_task.status = 'completed' then
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
    select
      updated_task.organization_id,
      updated_task.project_id,
      'task_completed',
      'Aufgabe wurde erledigt',
      'task',
      updated_task.id,
      jsonb_build_object('taskTitle', updated_task.title),
      'task:' || updated_task.id::text || ':completed',
      uid
    where updated_task.project_id is not null
    on conflict (organization_id, event_key) where event_key is not null do nothing;
  end if;

  return updated_task;
end;
$$;

revoke all on function public.update_project_task(uuid, jsonb) from public, anon;
grant execute on function public.update_project_task(uuid, jsonb) to authenticated, service_role;

create or replace function public.list_project_task_assignees(p_project_id uuid)
returns table (
  user_id uuid,
  display_name text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  project_organization_id uuid;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  select project.organization_id
  into project_organization_id
  from public.projects project
  where project.id = p_project_id;

  if project_organization_id is null then
    raise exception 'project_not_found';
  end if;
  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = project_organization_id
      and membership.user_id = uid
  ) then
    raise exception 'organization_access_denied';
  end if;

  return query
  select
    membership.user_id,
    coalesce(
      nullif(btrim(profile.first_name || ' ' || profile.last_name), ''),
      case when membership.user_id = uid then 'Ich' else 'Teammitglied' end
    )
  from public.organization_members membership
  left join public.profiles profile on profile.id = membership.user_id
  where membership.organization_id = project_organization_id
  order by
    case when membership.user_id = uid then 0 else 1 end,
    profile.first_name nulls last,
    profile.last_name nulls last,
    membership.user_id;
end;
$$;

revoke all on function public.list_project_task_assignees(uuid) from public, anon;
grant execute on function public.list_project_task_assignees(uuid) to authenticated, service_role;
