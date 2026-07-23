import { supabase } from "@/supabaseClient";
import type { Database, Json } from "@/lib/supabase.types";
import type { Project } from "@/types";
import type {
  ProjectActivity,
  ProjectAppointment,
  ProjectTask,
} from "@/domain/projects";
import type { ProjectCreateInput } from "@/features/projects/projectSchemas";

type DbProjectRow = Database["public"]["Tables"]["projects"]["Row"];

const PROJECT_FIELDS =
  "id,organization_id,user_id,client_id,project_number,name,description,status,phase,priority,project_type,source,estimated_value,accepted_value,start_date,target_end_date,actual_end_date,address_line1,address_line2,postal_code,city,country,next_action_type,next_action_at,next_action_label,assigned_user_id,created_by,budget_type,hourly_rate,budget_total,created_at,updated_at,archived_at,last_activity_at" as const;

export type ProjectSort =
  | "attention"
  | "updated"
  | "next_action"
  | "created"
  | "value"
  | "priority";

export type ProjectPageOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  phases?: Project["phase"][];
  statuses?: Project["status"][] | null;
  priorities?: Project["priority"][];
  customerId?: string;
  assignedUserId?: string;
  needsAttention?: boolean;
  includeArchived?: boolean;
  sort?: ProjectSort;
};

export type ProjectPage = {
  items: Project[];
  nextPage: number | null;
  hasMore: boolean;
};

export type ProjectMetrics = {
  activeCount: number;
  plannedValue: number;
};

export async function dbGetCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt. Bitte anmelden.");
  return data.user.id;
}

export async function dbGetCurrentOrganizationId(): Promise<string> {
  const uid = await dbGetCurrentUserId();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", uid)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.organization_id) throw new Error("Für dieses Konto wurde kein Betrieb gefunden.");
  return data.organization_id;
}

export const toProject = (row: DbProjectRow): Project => ({
  id: row.id,
  organizationId: row.organization_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  clientId: row.client_id ?? undefined,
  projectNumber: row.project_number,
  name: row.name,
  description: row.description,
  budgetType: row.budget_type as Project["budgetType"],
  hourlyRate: Number(row.hourly_rate ?? 0),
  budgetTotal: Number(row.budget_total ?? 0),
  status: row.status as Project["status"],
  phase: row.phase as Project["phase"],
  priority: row.priority as Project["priority"],
  projectType: row.project_type,
  source: row.source,
  estimatedValue: row.estimated_value == null ? null : Number(row.estimated_value),
  acceptedValue: row.accepted_value == null ? null : Number(row.accepted_value),
  startDate: row.start_date,
  targetEndDate: row.target_end_date,
  actualEndDate: row.actual_end_date,
  addressLine1: row.address_line1,
  addressLine2: row.address_line2,
  postalCode: row.postal_code,
  city: row.city,
  country: row.country,
  nextActionType: row.next_action_type,
  nextActionAt: row.next_action_at,
  nextActionLabel: row.next_action_label,
  assignedUserId: row.assigned_user_id,
  createdBy: row.created_by,
  archivedAt: row.archived_at,
  lastActivityAt: row.last_activity_at,
});

export async function dbListProjects(): Promise<Project[]> {
  const page = await dbListProjectsPage({ pageSize: 100, statuses: null, includeArchived: true });
  return page.items;
}

export async function dbListProjectsPage(
  options: ProjectPageOptions = {},
): Promise<ProjectPage> {
  await dbGetCurrentUserId();
  const page = Math.max(0, Math.trunc(options.page ?? 0));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(options.pageSize ?? 24)));
  const { data, error } = await supabase.rpc("list_projects_page", {
    p_search: options.search?.trim() || null,
    p_phases: options.phases?.length ? options.phases : null,
    p_statuses: options.statuses === null ? null : options.statuses?.length ? options.statuses : ["active"],
    p_priorities: options.priorities?.length ? options.priorities : null,
    p_customer_id: options.customerId || null,
    p_assigned_user_id: options.assignedUserId || null,
    p_needs_attention: options.needsAttention ?? null,
    p_include_archived: options.includeArchived ?? false,
    p_sort: options.sort ?? "attention",
    p_limit: pageSize + 1,
    p_offset: page * pageSize,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbProjectRow[];
  const hasMore = rows.length > pageSize;
  return {
    items: rows.slice(0, pageSize).map(toProject),
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
}

export async function dbGetProject(projectId: string): Promise<Project | null> {
  await dbGetCurrentUserId();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProject(data as DbProjectRow) : null;
}

export async function dbGetProjectActivities(projectId: string): Promise<ProjectActivity[]> {
  await dbGetCurrentUserId();
  const { data, error } = await supabase
    .from("project_activities")
    .select("id,project_id,activity_type,title,description,entity_type,entity_id,metadata,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    activityType: row.activity_type as ProjectActivity["activityType"],
    title: row.title,
    description: row.description,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

export async function dbGetRecentProjectActivities(limit = 8): Promise<ProjectActivity[]> {
  await dbGetCurrentUserId();
  const { data, error } = await supabase
    .from("project_activities")
    .select("id,project_id,activity_type,title,description,entity_type,entity_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(20, Math.max(1, limit)));
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    activityType: row.activity_type as ProjectActivity["activityType"],
    title: row.title,
    description: row.description,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

export async function dbGetProjectTasks(projectId: string): Promise<ProjectTask[]> {
  await dbGetCurrentUserId();
  const { data, error } = await supabase
    .from("project_tasks")
    .select("id,organization_id,project_id,customer_id,title,description,status,priority,due_at,assigned_user_id,completed_at,created_by,created_at,updated_at")
    .eq("project_id", projectId)
    .in("status", ["open", "in_progress"])
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    customerId: row.customer_id,
    title: row.title,
    description: row.description,
    status: row.status as ProjectTask["status"],
    priority: row.priority as ProjectTask["priority"],
    dueAt: row.due_at,
    assignedUserId: row.assigned_user_id,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function dbGetProjectAppointments(projectId: string): Promise<ProjectAppointment[]> {
  await dbGetCurrentUserId();
  const { data, error } = await supabase
    .from("project_appointments")
    .select("id,project_id,title,starts_at,ends_at,appointment_type")
    .eq("project_id", projectId)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    appointmentType: row.appointment_type as ProjectAppointment["appointmentType"],
  }));
}

export async function dbGetProjectMetrics(): Promise<ProjectMetrics> {
  await dbGetCurrentUserId();
  const { data, error } = await supabase.rpc("get_project_metrics");
  if (error) throw new Error(error.message);
  const metrics = data?.[0];
  return {
    activeCount: Number(metrics?.active_count ?? 0),
    plannedValue: Number(metrics?.planned_value ?? 0),
  };
}

export async function dbCreateProject(input: ProjectCreateInput): Promise<Project> {
  const organizationId = await dbGetCurrentOrganizationId();
  const { data, error } = await supabase.rpc("create_project", {
    p_organization_id: organizationId,
    p_project: input as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return toProject(data as DbProjectRow);
}

export async function dbUpdateProject(
  projectId: string,
  patch: Record<string, unknown>,
): Promise<Project> {
  await dbGetCurrentUserId();
  const { data, error } = await supabase.rpc("update_project", {
    p_project_id: projectId,
    p_patch: patch as Json,
  });
  if (error) throw new Error(error.message);
  return toProject(data as DbProjectRow);
}

export async function dbUpsertProject(project: Project): Promise<void> {
  const uid = await dbGetCurrentUserId();
  const organizationId = project.organizationId ?? (await dbGetCurrentOrganizationId());
  const payload: Database["public"]["Tables"]["projects"]["Insert"] = {
    id: project.id,
    organization_id: organizationId,
    user_id: uid,
    client_id: project.clientId ?? null,
    name: project.name,
    budget_type: project.budgetType,
    hourly_rate: project.hourlyRate,
    budget_total: project.budgetTotal,
    status: project.status,
    phase: project.phase,
    priority: project.priority,
    created_by: project.createdBy ?? uid,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("projects").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}
