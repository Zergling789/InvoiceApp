import type { ProjectTask, ProjectTaskStatus } from "@/domain/projects";
import type { Database, Json } from "@/lib/supabase.types";
import { supabase } from "@/supabaseClient";

type ProjectTaskRow = Database["public"]["Tables"]["project_tasks"]["Row"];

const TASK_FIELDS =
  "id,organization_id,project_id,customer_id,title,description,status,priority,due_at,assigned_user_id,completed_at,created_by,created_at,updated_at" as const;

const toProjectTask = (row: ProjectTaskRow): ProjectTask => ({
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
});

export type ProjectTaskListOptions = {
  projectId?: string;
  statuses?: ProjectTaskStatus[];
  assignedUserId?: string;
  limit?: number;
};

export type ProjectTaskAssignee = {
  userId: string;
  displayName: string;
};

export async function dbListProjectTasks(
  options: ProjectTaskListOptions = {},
): Promise<ProjectTask[]> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  let query = supabase
    .from("project_tasks")
    .select(TASK_FIELDS)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (options.projectId) query = query.eq("project_id", options.projectId);
  if (options.statuses?.length) query = query.in("status", options.statuses);
  if (options.assignedUserId) query = query.eq("assigned_user_id", options.assignedUserId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toProjectTask(row as ProjectTaskRow));
}

export async function dbCreateProjectTask(
  projectId: string,
  input: Record<string, unknown>,
): Promise<ProjectTask> {
  const { data, error } = await supabase.rpc("create_project_task", {
    p_project_id: projectId,
    p_task: input as Json,
  });
  if (error) throw new Error(error.message);
  return toProjectTask(data);
}

export async function dbUpdateProjectTask(
  taskId: string,
  patch: Record<string, unknown>,
): Promise<ProjectTask> {
  const { data, error } = await supabase.rpc("update_project_task", {
    p_task_id: taskId,
    p_patch: patch as Json,
  });
  if (error) throw new Error(error.message);
  return toProjectTask(data);
}

export async function dbListProjectTaskAssignees(
  projectId: string,
): Promise<ProjectTaskAssignee[]> {
  const { data, error } = await supabase.rpc("list_project_task_assignees", {
    p_project_id: projectId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((entry) => ({
    userId: entry.user_id,
    displayName: entry.display_name,
  }));
}
