-- Project-centric foundation.
-- Existing user-owned rows are migrated into a personal organization whose id
-- equals the existing user_id. This preserves every existing relation while
-- allowing organization memberships to grow later.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.organizations (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 160),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

insert into public.organizations (id, name, created_by)
select
  users.id,
  coalesce(nullif(btrim(settings.company_name), ''), 'Mein Betrieb'),
  users.id
from auth.users users
left join public.user_settings settings on settings.user_id = users.id
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select users.id, users.id, 'owner'
from auth.users users
on conflict (organization_id, user_id) do nothing;

create or replace function private.bootstrap_personal_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organizations (id, name, created_by)
  values (new.id, 'Mein Betrieb', new.id)
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.id, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.bootstrap_personal_organization() from public, anon, authenticated;
drop trigger if exists on_auth_user_create_personal_organization on auth.users;
create trigger on_auth_user_create_personal_organization
after insert on auth.users
for each row execute function private.bootstrap_personal_organization();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy organizations_select_member
on public.organizations for select to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = organizations.id
      and membership.user_id = (select auth.uid())
  )
);

create policy organizations_update_owner
on public.organizations for update to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = organizations.id
      and membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = organizations.id
      and membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'admin')
  )
);

create policy organization_members_select_own
on public.organization_members for select to authenticated
using (user_id = (select auth.uid()));

grant select, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;

alter table public.clients add column if not exists organization_id uuid;
alter table public.projects add column if not exists organization_id uuid;
alter table public.offers add column if not exists organization_id uuid;
alter table public.invoices add column if not exists organization_id uuid;
alter table public.notifications add column if not exists organization_id uuid;

update public.clients set organization_id = user_id where organization_id is null;
update public.projects set organization_id = user_id where organization_id is null;
update public.offers set organization_id = user_id where organization_id is null;
update public.invoices set organization_id = user_id where organization_id is null;
update public.notifications set organization_id = user_id where organization_id is null;

alter table public.clients alter column organization_id set not null;
alter table public.projects alter column organization_id set not null;
alter table public.offers alter column organization_id set not null;
alter table public.invoices alter column organization_id set not null;
alter table public.notifications alter column organization_id set not null;

alter table public.clients
  add constraint clients_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete restrict;
alter table public.projects
  add constraint projects_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete restrict;
alter table public.offers
  add constraint offers_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete restrict;
alter table public.invoices
  add constraint invoices_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete restrict;
alter table public.notifications
  add constraint notifications_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete restrict;

alter table public.clients add constraint clients_id_organization_key unique (id, organization_id);
alter table public.projects add constraint projects_id_organization_key unique (id, organization_id);

create or replace function private.assign_legacy_organization()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is null then
    new.organization_id := coalesce((select auth.uid()), new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function private.assign_legacy_organization() from public, anon, authenticated;

create or replace function private.enforce_legacy_tenant()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id_is_immutable';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'user_id_is_immutable';
  end if;
  if uid is not null and not exists (
    select 1 from public.organization_members membership
    where membership.organization_id = new.organization_id
      and membership.user_id = uid
  ) then
    raise exception 'organization_access_denied';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_legacy_tenant() from public, anon, authenticated;

drop trigger if exists clients_assign_organization on public.clients;
create trigger clients_assign_organization
before insert on public.clients
for each row execute function private.assign_legacy_organization();
drop trigger if exists projects_assign_organization on public.projects;
create trigger projects_assign_organization
before insert on public.projects
for each row execute function private.assign_legacy_organization();
drop trigger if exists offers_assign_organization on public.offers;
create trigger offers_assign_organization
before insert on public.offers
for each row execute function private.assign_legacy_organization();
drop trigger if exists invoices_assign_organization on public.invoices;
create trigger invoices_assign_organization
before insert on public.invoices
for each row execute function private.assign_legacy_organization();
drop trigger if exists notifications_assign_organization on public.notifications;
create trigger notifications_assign_organization
before insert on public.notifications
for each row execute function private.assign_legacy_organization();

drop trigger if exists clients_enforce_tenant on public.clients;
create trigger clients_enforce_tenant
before insert or update on public.clients
for each row execute function private.enforce_legacy_tenant();
drop trigger if exists projects_enforce_tenant on public.projects;
create trigger projects_enforce_tenant
before insert or update on public.projects
for each row execute function private.enforce_legacy_tenant();
drop trigger if exists offers_enforce_tenant on public.offers;
create trigger offers_enforce_tenant
before insert or update on public.offers
for each row execute function private.enforce_legacy_tenant();
drop trigger if exists invoices_enforce_tenant on public.invoices;
create trigger invoices_enforce_tenant
before insert or update on public.invoices
for each row execute function private.enforce_legacy_tenant();
drop trigger if exists notifications_enforce_tenant on public.notifications;
create trigger notifications_enforce_tenant
before insert or update on public.notifications
for each row execute function private.enforce_legacy_tenant();

alter table public.projects drop constraint if exists projects_client_id_fkey;
alter table public.projects alter column client_id drop not null;
alter table public.projects
  add constraint projects_client_organization_fkey
  foreign key (client_id, organization_id)
  references public.clients(id, organization_id)
  on delete set null;

alter table public.offers
  add constraint offers_project_organization_fkey
  foreign key (project_id, organization_id)
  references public.projects(id, organization_id);
alter table public.invoices
  add constraint invoices_project_organization_fkey
  foreign key (project_id, organization_id)
  references public.projects(id, organization_id);
alter table public.offers
  add constraint offers_client_organization_fkey
  foreign key (client_id, organization_id)
  references public.clients(id, organization_id);
alter table public.invoices
  add constraint invoices_client_organization_fkey
  foreign key (client_id, organization_id)
  references public.clients(id, organization_id);

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('active', 'completed', 'cancelled', 'archived'));

alter table public.projects add column if not exists project_number text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists phase text not null default 'inquiry';
alter table public.projects add column if not exists priority text not null default 'normal';
alter table public.projects add column if not exists project_type text;
alter table public.projects add column if not exists source text;
alter table public.projects add column if not exists estimated_value numeric;
alter table public.projects add column if not exists accepted_value numeric;
alter table public.projects add column if not exists start_date date;
alter table public.projects add column if not exists target_end_date date;
alter table public.projects add column if not exists actual_end_date date;
alter table public.projects add column if not exists address_line1 text;
alter table public.projects add column if not exists address_line2 text;
alter table public.projects add column if not exists postal_code text;
alter table public.projects add column if not exists city text;
alter table public.projects add column if not exists country text;
alter table public.projects add column if not exists next_action_type text;
alter table public.projects add column if not exists next_action_at timestamptz;
alter table public.projects add column if not exists next_action_label text;
alter table public.projects add column if not exists assigned_user_id uuid;
alter table public.projects add column if not exists created_by uuid;
alter table public.projects add column if not exists archived_at timestamptz;
alter table public.projects add column if not exists last_activity_at timestamptz;

update public.projects
set
  estimated_value = case
    when budget_type = 'hourly' then coalesce(hourly_rate, 0) * coalesce(budget_total, 0)
    else coalesce(budget_total, 0)
  end,
  created_by = user_id
where created_by is null;

alter table public.projects alter column created_by set not null;
alter table public.projects
  add constraint projects_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete restrict;
alter table public.projects
  add constraint projects_assigned_member_fkey
  foreign key (organization_id, assigned_user_id)
  references public.organization_members(organization_id, user_id);
alter table public.projects
  add constraint projects_created_member_fkey
  foreign key (organization_id, created_by)
  references public.organization_members(organization_id, user_id);
alter table public.projects
  add constraint projects_phase_check check (
    phase in (
      'inquiry', 'qualification', 'site_visit', 'planning', 'quote_draft',
      'quote_sent', 'quote_follow_up', 'accepted', 'scheduled', 'in_progress',
      'completion', 'invoiced', 'payment_pending', 'completed', 'lost', 'cancelled'
    )
  );
alter table public.projects
  add constraint projects_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));
alter table public.projects
  add constraint projects_values_nonnegative_check check (
    (estimated_value is null or estimated_value >= 0)
    and (accepted_value is null or accepted_value >= 0)
  );
alter table public.projects
  add constraint projects_title_length_check check (char_length(name) between 1 and 180);
alter table public.projects
  add constraint projects_description_length_check check (
    description is null or char_length(description) <= 5000
  );
alter table public.projects
  add constraint projects_next_action_length_check check (
    next_action_label is null or char_length(next_action_label) <= 240
  );
alter table public.projects
  add constraint projects_dates_check check (
    target_end_date is null or start_date is null or target_end_date >= start_date
  );

create unique index if not exists projects_organization_number_key
  on public.projects (organization_id, project_number)
  where project_number is not null;
create index if not exists projects_organization_status_attention_idx
  on public.projects (organization_id, status, next_action_at, priority, updated_at desc);
create index if not exists projects_organization_phase_idx
  on public.projects (organization_id, phase, updated_at desc);
create index if not exists projects_organization_customer_idx
  on public.projects (organization_id, client_id, updated_at desc);
create index if not exists projects_organization_assignee_idx
  on public.projects (organization_id, assigned_user_id, updated_at desc);
create index if not exists projects_organization_number_idx
  on public.projects (organization_id, project_number);

create table if not exists public.project_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year integer not null check (year between 2000 and 9999),
  counter bigint not null default 0 check (counter >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, year)
);

create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  activity_type text not null check (
    activity_type in (
      'project_created', 'project_updated', 'phase_changed', 'status_changed',
      'customer_assigned', 'quote_created', 'quote_sent', 'quote_viewed',
      'quote_accepted', 'quote_rejected', 'invoice_created', 'invoice_sent',
      'invoice_paid', 'invoice_overdue', 'task_created', 'task_completed',
      'appointment_created', 'note_added', 'file_uploaded'
    )
  ),
  title text not null check (char_length(title) between 1 and 240),
  description text check (description is null or char_length(description) <= 5000),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  event_key text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint project_activities_project_organization_fkey
    foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade
);

create unique index if not exists project_activities_event_key
  on public.project_activities (organization_id, event_key)
  where event_key is not null;
create index if not exists project_activities_timeline_idx
  on public.project_activities (organization_id, project_id, created_at desc, id desc);

create or replace function private.touch_project_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects
  set last_activity_at = greatest(coalesce(last_activity_at, new.created_at), new.created_at),
      updated_at = greatest(updated_at, new.created_at)
  where id = new.project_id
    and organization_id = new.organization_id;
  return new;
end;
$$;

revoke all on function private.touch_project_activity() from public, anon, authenticated;
drop trigger if exists project_activities_touch_project on public.project_activities;
create trigger project_activities_touch_project
after insert on public.project_activities
for each row execute function private.touch_project_activity();

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  customer_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  description text check (description is null or char_length(description) <= 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  assigned_user_id uuid,
  completed_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (customer_id, organization_id)
    references public.clients(id, organization_id) on delete set null,
  foreign key (organization_id, assigned_user_id)
    references public.organization_members(organization_id, user_id),
  foreign key (organization_id, created_by)
    references public.organization_members(organization_id, user_id)
);

create index if not exists project_tasks_open_idx
  on public.project_tasks (organization_id, project_id, status, due_at)
  where status in ('open', 'in_progress');

create table if not exists public.project_appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  customer_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  appointment_type text not null default 'other' check (
    appointment_type in (
      'site_visit', 'project_start', 'work_day', 'delivery', 'inspection',
      'handover', 'follow_up', 'other'
    )
  ),
  location text,
  note text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (customer_id, organization_id)
    references public.clients(id, organization_id) on delete set null,
  foreign key (organization_id, created_by)
    references public.organization_members(organization_id, user_id)
);

create index if not exists project_appointments_upcoming_idx
  on public.project_appointments (organization_id, project_id, starts_at);

alter table public.project_counters enable row level security;
alter table public.project_activities enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_appointments enable row level security;

create policy project_counters_member_all
on public.project_counters for all to authenticated
using (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project_counters.organization_id
      and membership.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project_counters.organization_id
      and membership.user_id = (select auth.uid())
  )
);

create policy project_activities_member_select
on public.project_activities for select to authenticated
using (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project_activities.organization_id
      and membership.user_id = (select auth.uid())
  )
);

create policy project_tasks_member_all
on public.project_tasks for all to authenticated
using (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project_tasks.organization_id
      and membership.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project_tasks.organization_id
      and membership.user_id = (select auth.uid())
      and project_tasks.created_by = (select auth.uid())
  )
);

create policy project_appointments_member_all
on public.project_appointments for all to authenticated
using (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project_appointments.organization_id
      and membership.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project_appointments.organization_id
      and membership.user_id = (select auth.uid())
      and project_appointments.created_by = (select auth.uid())
  )
);

drop policy if exists projects_select_own on public.projects;
drop policy if exists projects_insert_own on public.projects;
drop policy if exists projects_update_own on public.projects;
drop policy if exists projects_delete_own on public.projects;

create policy projects_member_select
on public.projects for select to authenticated
using (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = projects.organization_id
      and membership.user_id = (select auth.uid())
  )
);
create policy projects_member_insert
on public.projects for insert to authenticated
with check (
  created_by = (select auth.uid())
  and user_id = (select auth.uid())
  and exists (
    select 1 from public.organization_members membership
    where membership.organization_id = projects.organization_id
      and membership.user_id = (select auth.uid())
  )
);
create policy projects_member_update
on public.projects for update to authenticated
using (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = projects.organization_id
      and membership.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = projects.organization_id
      and membership.user_id = (select auth.uid())
  )
);

create or replace function private.project_phase_rank(p_phase text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_phase
    when 'inquiry' then 10
    when 'qualification' then 20
    when 'site_visit' then 30
    when 'planning' then 40
    when 'quote_draft' then 50
    when 'quote_sent' then 60
    when 'quote_follow_up' then 70
    when 'accepted' then 80
    when 'scheduled' then 90
    when 'in_progress' then 100
    when 'completion' then 110
    when 'invoiced' then 120
    when 'payment_pending' then 130
    when 'completed' then 140
    when 'lost' then 900
    when 'cancelled' then 910
    else 0
  end;
$$;

revoke all on function private.project_phase_rank(text) from public, anon, authenticated;

create or replace function public.create_project(p_organization_id uuid, p_project jsonb)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  counter_value bigint;
  current_year integer := extract(year from current_date)::integer;
  generated_number text;
  inserted_project public.projects;
  customer_id uuid;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists (
    select 1 from public.organization_members membership
    where membership.organization_id = p_organization_id
      and membership.user_id = uid
  ) then
    raise exception 'organization_access_denied';
  end if;

  if nullif(btrim(p_project->>'title'), '') is null
    or char_length(btrim(p_project->>'title')) > 180 then
    raise exception 'invalid_project_title';
  end if;
  if coalesce(p_project->>'phase', 'inquiry') not in (
    'inquiry', 'qualification', 'site_visit', 'planning', 'quote_draft',
    'quote_sent', 'quote_follow_up', 'accepted', 'scheduled', 'in_progress',
    'completion', 'invoiced', 'payment_pending', 'completed', 'lost', 'cancelled'
  ) then raise exception 'invalid_project_phase'; end if;
  if coalesce(p_project->>'priority', 'normal') not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'invalid_project_priority';
  end if;

  customer_id := nullif(p_project->>'customerId', '')::uuid;
  if customer_id is not null and not exists (
    select 1 from public.clients customer
    where customer.id = customer_id
      and customer.organization_id = p_organization_id
  ) then raise exception 'invalid_project_customer'; end if;
  if nullif(p_project->>'assignedUserId', '') is not null and not exists (
    select 1 from public.organization_members membership
    where membership.organization_id = p_organization_id
      and membership.user_id = nullif(p_project->>'assignedUserId', '')::uuid
  ) then raise exception 'invalid_project_assignee'; end if;

  insert into public.project_counters (organization_id, year, counter)
  values (p_organization_id, current_year, 1)
  on conflict (organization_id, year)
  do update set counter = public.project_counters.counter + 1, updated_at = now()
  returning counter into counter_value;

  generated_number := format('PR-%s-%s', current_year, lpad(counter_value::text, 4, '0'));

  insert into public.projects (
    organization_id, user_id, client_id, project_number, name, description,
    status, phase, priority, project_type, source, estimated_value,
    start_date, target_end_date, address_line1, address_line2, postal_code,
    city, country, assigned_user_id, created_by, budget_type, hourly_rate,
    budget_total, updated_at
  )
  values (
    p_organization_id, uid, customer_id, generated_number, btrim(p_project->>'title'),
    nullif(btrim(p_project->>'description'), ''), 'active',
    coalesce(p_project->>'phase', 'inquiry'), coalesce(p_project->>'priority', 'normal'),
    nullif(btrim(p_project->>'projectType'), ''), nullif(btrim(p_project->>'source'), ''),
    nullif(p_project->>'estimatedValue', '')::numeric,
    nullif(p_project->>'startDate', '')::date, nullif(p_project->>'targetEndDate', '')::date,
    nullif(btrim(p_project->>'addressLine1'), ''), nullif(btrim(p_project->>'addressLine2'), ''),
    nullif(btrim(p_project->>'postalCode'), ''), nullif(btrim(p_project->>'city'), ''),
    coalesce(nullif(btrim(p_project->>'country'), ''), 'Deutschland'),
    nullif(p_project->>'assignedUserId', '')::uuid, uid, 'fixed', 0,
    coalesce(nullif(p_project->>'estimatedValue', '')::numeric, 0), now()
  )
  returning * into inserted_project;

  insert into public.project_activities (
    organization_id, project_id, activity_type, title, event_key, created_by
  )
  values (
    p_organization_id, inserted_project.id, 'project_created', 'Projekt wurde erstellt',
    'project_created:' || inserted_project.id::text, uid
  );

  return inserted_project;
end;
$$;

revoke all on function public.create_project(uuid, jsonb) from public, anon;
grant execute on function public.create_project(uuid, jsonb) to authenticated, service_role;

create or replace function public.update_project(p_project_id uuid, p_patch jsonb)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_project public.projects;
  updated_project public.projects;
  next_phase text;
  next_status text;
  next_priority text;
  allowed_phase boolean;
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

  next_phase := coalesce(p_patch->>'phase', current_project.phase);
  next_status := coalesce(p_patch->>'status', current_project.status);
  next_priority := coalesce(p_patch->>'priority', current_project.priority);
  if next_status not in ('active', 'completed', 'cancelled', 'archived') then
    raise exception 'invalid_project_status';
  end if;
  if next_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'invalid_project_priority';
  end if;

  allowed_phase := next_phase = current_project.phase or next_phase = any(
    case current_project.phase
      when 'inquiry' then array['qualification','site_visit','lost','cancelled']
      when 'qualification' then array['site_visit','planning','quote_draft','lost','cancelled']
      when 'site_visit' then array['planning','quote_draft','lost','cancelled']
      when 'planning' then array['quote_draft','lost','cancelled']
      when 'quote_draft' then array['quote_sent','lost','cancelled']
      when 'quote_sent' then array['quote_follow_up','accepted','lost','cancelled']
      when 'quote_follow_up' then array['accepted','lost','cancelled']
      when 'accepted' then array['scheduled','in_progress','cancelled']
      when 'scheduled' then array['in_progress','cancelled']
      when 'in_progress' then array['completion','cancelled']
      when 'completion' then array['invoiced','completed']
      when 'invoiced' then array['payment_pending','completed']
      when 'payment_pending' then array['completed']
      when 'lost' then array['qualification','quote_draft']
      else array[]::text[]
    end
  );
  if not allowed_phase then raise exception 'invalid_project_phase_transition'; end if;

  if p_patch ? 'customerId' and nullif(p_patch->>'customerId', '') is not null and not exists (
    select 1 from public.clients customer
    where customer.id = nullif(p_patch->>'customerId', '')::uuid
      and customer.organization_id = current_project.organization_id
  ) then raise exception 'invalid_project_customer'; end if;
  if p_patch ? 'assignedUserId' and nullif(p_patch->>'assignedUserId', '') is not null and not exists (
    select 1 from public.organization_members membership
    where membership.organization_id = current_project.organization_id
      and membership.user_id = nullif(p_patch->>'assignedUserId', '')::uuid
  ) then raise exception 'invalid_project_assignee'; end if;

  update public.projects project
  set
    client_id = case when p_patch ? 'customerId' then nullif(p_patch->>'customerId', '')::uuid else project.client_id end,
    name = case when p_patch ? 'title' then btrim(p_patch->>'title') else project.name end,
    description = case when p_patch ? 'description' then nullif(btrim(p_patch->>'description'), '') else project.description end,
    status = next_status,
    phase = next_phase,
    priority = next_priority,
    project_type = case when p_patch ? 'projectType' then nullif(btrim(p_patch->>'projectType'), '') else project.project_type end,
    source = case when p_patch ? 'source' then nullif(btrim(p_patch->>'source'), '') else project.source end,
    estimated_value = case when p_patch ? 'estimatedValue' then nullif(p_patch->>'estimatedValue', '')::numeric else project.estimated_value end,
    accepted_value = case when p_patch ? 'acceptedValue' then nullif(p_patch->>'acceptedValue', '')::numeric else project.accepted_value end,
    start_date = case when p_patch ? 'startDate' then nullif(p_patch->>'startDate', '')::date else project.start_date end,
    target_end_date = case when p_patch ? 'targetEndDate' then nullif(p_patch->>'targetEndDate', '')::date else project.target_end_date end,
    actual_end_date = case when p_patch ? 'actualEndDate' then nullif(p_patch->>'actualEndDate', '')::date else project.actual_end_date end,
    address_line1 = case when p_patch ? 'addressLine1' then nullif(btrim(p_patch->>'addressLine1'), '') else project.address_line1 end,
    address_line2 = case when p_patch ? 'addressLine2' then nullif(btrim(p_patch->>'addressLine2'), '') else project.address_line2 end,
    postal_code = case when p_patch ? 'postalCode' then nullif(btrim(p_patch->>'postalCode'), '') else project.postal_code end,
    city = case when p_patch ? 'city' then nullif(btrim(p_patch->>'city'), '') else project.city end,
    country = case when p_patch ? 'country' then nullif(btrim(p_patch->>'country'), '') else project.country end,
    next_action_type = case when p_patch ? 'nextActionType' then nullif(btrim(p_patch->>'nextActionType'), '') else project.next_action_type end,
    next_action_label = case when p_patch ? 'nextActionLabel' then nullif(btrim(p_patch->>'nextActionLabel'), '') else project.next_action_label end,
    next_action_at = case when p_patch ? 'nextActionAt' then nullif(p_patch->>'nextActionAt', '')::timestamptz else project.next_action_at end,
    assigned_user_id = case when p_patch ? 'assignedUserId' then nullif(p_patch->>'assignedUserId', '')::uuid else project.assigned_user_id end,
    archived_at = case
      when next_status = 'archived' and project.archived_at is null then now()
      when next_status <> 'archived' then null
      else project.archived_at
    end,
    updated_at = now()
  where project.id = current_project.id
  returning * into updated_project;

  if current_project.phase is distinct from updated_project.phase then
    insert into public.project_activities (
      organization_id, project_id, activity_type, title, description, created_by
    ) values (
      current_project.organization_id, current_project.id, 'phase_changed',
      'Projektphase wurde geändert', current_project.phase || ' → ' || updated_project.phase, uid
    );
  elsif current_project.status is distinct from updated_project.status then
    insert into public.project_activities (
      organization_id, project_id, activity_type, title, description, created_by
    ) values (
      current_project.organization_id, current_project.id, 'status_changed',
      'Projektstatus wurde geändert', current_project.status || ' → ' || updated_project.status, uid
    );
  else
    insert into public.project_activities (
      organization_id, project_id, activity_type, title, created_by
    ) values (
      current_project.organization_id, current_project.id, 'project_updated',
      'Projekt wurde aktualisiert', uid
    );
  end if;
  return updated_project;
end;
$$;

revoke all on function public.update_project(uuid, jsonb) from public, anon;
grant execute on function public.update_project(uuid, jsonb) to authenticated, service_role;

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
    when 'QUOTE_REJECTED' then 'Ablehnung prüfen'
    when 'INVOICE_CREATED' then 'Rechnung versenden'
    when 'INVOICE_SENT' then 'Zahlung prüfen'
    when 'INVOICE_PAID' then 'Projektabschluss bestätigen'
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

create or replace function public.list_projects_page(
  p_search text default null,
  p_phases text[] default null,
  p_statuses text[] default array['active']::text[],
  p_priorities text[] default null,
  p_customer_id uuid default null,
  p_assigned_user_id uuid default null,
  p_needs_attention boolean default null,
  p_include_archived boolean default false,
  p_sort text default 'attention',
  p_limit integer default 24,
  p_offset integer default 0
)
returns setof public.projects
language sql
stable
security invoker
set search_path = ''
as $$
  select project.*
  from public.projects project
  left join public.clients customer
    on customer.id = project.client_id
   and customer.organization_id = project.organization_id
  where exists (
    select 1 from public.organization_members membership
    where membership.organization_id = project.organization_id
      and membership.user_id = (select auth.uid())
  )
    and (p_include_archived or project.archived_at is null)
    and (p_statuses is null or project.status = any(p_statuses))
    and (p_phases is null or project.phase = any(p_phases))
    and (p_priorities is null or project.priority = any(p_priorities))
    and (p_customer_id is null or project.client_id = p_customer_id)
    and (p_assigned_user_id is null or project.assigned_user_id = p_assigned_user_id)
    and (
      p_search is null
      or project.name ilike '%' || left(p_search, 100) || '%'
      or project.project_number ilike '%' || left(p_search, 100) || '%'
      or customer.company_name ilike '%' || left(p_search, 100) || '%'
      or customer.contact_person ilike '%' || left(p_search, 100) || '%'
    )
    and (
      p_needs_attention is not true
      or project.next_action_at < now()
      or project.priority = 'urgent'
      or project.phase in ('quote_sent', 'quote_follow_up', 'accepted', 'completion', 'payment_pending')
    )
  order by
    case when p_sort = 'attention' then
      case
        when project.next_action_at < now() then 0
        when project.priority = 'urgent' then 1
        when project.phase in ('quote_sent', 'quote_follow_up') then 2
        when project.phase = 'accepted' and project.start_date is null then 3
        when project.phase = 'completion' then 4
        when project.phase = 'payment_pending' then 5
        else 6
      end
    end asc,
    case when p_sort = 'next_action' then project.next_action_at end asc nulls last,
    case when p_sort = 'created' then project.created_at end desc,
    case when p_sort = 'value' then coalesce(project.accepted_value, project.estimated_value) end desc nulls last,
    case when p_sort = 'priority' then
      case project.priority when 'urgent' then 4 when 'high' then 3 when 'normal' then 2 else 1 end
    end desc,
    project.updated_at desc,
    project.id desc
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.list_projects_page(
  text, text[], text[], text[], uuid, uuid, boolean, boolean, text, integer, integer
) from public, anon;
grant execute on function public.list_projects_page(
  text, text[], text[], text[], uuid, uuid, boolean, boolean, text, integer, integer
) to authenticated, service_role;

create or replace function public.get_project_metrics()
returns table(active_count bigint, planned_value numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*)::bigint,
    coalesce(sum(coalesce(project.accepted_value, project.estimated_value, 0)), 0)::numeric
  from public.projects project
  where project.status = 'active'
    and project.archived_at is null
    and exists (
      select 1 from public.organization_members membership
      where membership.organization_id = project.organization_id
        and membership.user_id = (select auth.uid())
    );
$$;

create or replace function private.sync_document_project_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  event_name text;
  event_key text;
begin
  if new.project_id is null then return new; end if;

  if tg_table_name = 'offers' then
    if tg_op = 'INSERT' then event_name := 'QUOTE_CREATED';
    elsif new.status = 'SENT' and old.status is distinct from new.status then event_name := 'QUOTE_SENT';
    elsif new.status = 'ACCEPTED' and old.status is distinct from new.status then event_name := 'QUOTE_ACCEPTED';
    elsif new.status = 'REJECTED' and old.status is distinct from new.status then event_name := 'QUOTE_REJECTED';
    end if;
  elsif tg_table_name = 'invoices' then
    if tg_op = 'INSERT' then event_name := 'INVOICE_CREATED';
    elsif new.status = 'SENT' and old.status is distinct from new.status then event_name := 'INVOICE_SENT';
    elsif new.status = 'PAID' and old.status is distinct from new.status then event_name := 'INVOICE_PAID';
    end if;
  end if;

  if event_name is not null then
    event_key := lower(event_name) || ':' || new.id::text;
    perform public.apply_project_transition(new.project_id, event_name, event_key);
    update public.project_activities activity
    set entity_type = case when tg_table_name = 'offers' then 'offer' else 'invoice' end,
        entity_id = new.id,
        metadata = jsonb_build_object('number', new.number)
    where activity.organization_id = new.organization_id
      and activity.event_key = event_key;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_document_project_event() from public, anon, authenticated;
drop trigger if exists offers_sync_project_event on public.offers;
create trigger offers_sync_project_event
after insert or update of status on public.offers
for each row execute function private.sync_document_project_event();
drop trigger if exists invoices_sync_project_event on public.invoices;
create trigger invoices_sync_project_event
after insert or update of status on public.invoices
for each row execute function private.sync_document_project_event();

grant select, insert, update on public.projects to authenticated;
grant select on public.project_activities to authenticated;
grant select, insert, update, delete on public.project_tasks to authenticated;
grant select, insert, update, delete on public.project_appointments to authenticated;
grant select, insert, update on public.project_counters to authenticated;

revoke insert, update, delete on public.project_activities from authenticated;
