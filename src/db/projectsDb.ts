// src/db/projectsDb.ts
import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";
import type { Project } from "@/types";
import {
  buildDescendingCursorFilter,
  buildIlikeAnyFilter,
  buildInFilter,
  createCursorPage,
  normalizePageSize,
  type CursorPage,
  type CursorPageOptions,
} from "@/db/cursorPagination";

type DbProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type DbProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

const PROJECT_FIELDS =
  "id,user_id,client_id,name,budget_type,hourly_rate,budget_total,status,created_at" as const;

export type ProjectPageOptions = CursorPageOptions & {
  search?: string;
  status?: Project["status"] | "all";
  matchingClientIds?: string[];
};

export type ProjectMetrics = {
  activeCount: number;
  plannedValue: number;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt. Bitte anmelden.");
  return data.user.id;
}

export async function dbListProjects(): Promise<Project[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as DbProjectRow[]).map(toProject);
}

const toProject = (r: DbProjectRow): Project => ({
    id: r.id,
    createdAt: r.created_at,
    clientId: r.client_id,
    name: r.name,
    budgetType: r.budget_type as Project["budgetType"],
    hourlyRate: Number(r.hourly_rate ?? 0),
    budgetTotal: Number(r.budget_total ?? 0),
    status: r.status as Project["status"],
});

export async function dbListProjectsPage(
  options: ProjectPageOptions = {},
): Promise<CursorPage<Project>> {
  const uid = await requireUserId();
  const pageSize = normalizePageSize(options.pageSize);
  let query = supabase
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.search?.trim()) {
    const clientFilter = options.matchingClientIds?.length
      ? [buildInFilter("client_id", options.matchingClientIds)]
      : [];
    query = query.or(buildIlikeAnyFilter(["name"], options.search, clientFilter));
  }
  if (options.cursor) {
    query = query.or(buildDescendingCursorFilter(options.cursor));
  }

  const { data, error } = await query.limit(pageSize + 1);
  if (error) throw new Error(error.message);

  return createCursorPage((data ?? []) as DbProjectRow[], pageSize, toProject);
}

export async function dbGetProjectMetrics(): Promise<ProjectMetrics> {
  await requireUserId();
  const { data, error } = await supabase.rpc("get_project_metrics");
  if (error) throw new Error(error.message);
  const metrics = data?.[0];
  return {
    activeCount: Number(metrics?.active_count ?? 0),
    plannedValue: Number(metrics?.planned_value ?? 0),
  };
}

export async function dbUpsertProject(p: Project): Promise<void> {
  const uid = await requireUserId();

  const payload: DbProjectInsert = {
    id: p.id,
    user_id: uid,
    client_id: p.clientId,
    name: p.name,
    budget_type: p.budgetType,
    hourly_rate: p.hourlyRate,
    budget_total: p.budgetTotal,
    status: p.status,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("projects").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}
