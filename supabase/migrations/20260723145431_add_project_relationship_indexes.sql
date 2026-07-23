-- Cover tenant relationship foreign keys without changing existing query indexes.
create index if not exists clients_organization_fk_idx
  on public.clients (organization_id);
create index if not exists notifications_organization_fk_idx
  on public.notifications (organization_id);
create index if not exists offers_client_organization_fk_idx
  on public.offers (client_id, organization_id);
create index if not exists offers_project_organization_fk_idx
  on public.offers (project_id, organization_id);
create index if not exists offers_organization_fk_idx
  on public.offers (organization_id);
create index if not exists invoices_client_organization_fk_idx
  on public.invoices (client_id, organization_id);
create index if not exists invoices_project_organization_fk_idx
  on public.invoices (project_id, organization_id);
create index if not exists invoices_organization_fk_idx
  on public.invoices (organization_id);
create index if not exists organization_members_user_fk_idx
  on public.organization_members (user_id);
create index if not exists organizations_created_by_fk_idx
  on public.organizations (created_by);
create index if not exists projects_client_organization_fk_idx
  on public.projects (client_id, organization_id);
create index if not exists projects_created_by_fk_idx
  on public.projects (created_by);
create index if not exists projects_created_member_fk_idx
  on public.projects (organization_id, created_by);
create index if not exists project_activities_created_by_fk_idx
  on public.project_activities (created_by);
create index if not exists project_activities_project_organization_fk_idx
  on public.project_activities (project_id, organization_id);
create index if not exists project_tasks_customer_organization_fk_idx
  on public.project_tasks (customer_id, organization_id);
create index if not exists project_tasks_assignee_organization_fk_idx
  on public.project_tasks (organization_id, assigned_user_id);
create index if not exists project_tasks_creator_organization_fk_idx
  on public.project_tasks (organization_id, created_by);
create index if not exists project_tasks_project_organization_fk_idx
  on public.project_tasks (project_id, organization_id);
create index if not exists project_appointments_customer_organization_fk_idx
  on public.project_appointments (customer_id, organization_id);
create index if not exists project_appointments_creator_organization_fk_idx
  on public.project_appointments (organization_id, created_by);
create index if not exists project_appointments_project_organization_fk_idx
  on public.project_appointments (project_id, organization_id);
