// src/db/projectsDb.ts
import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";
import type { Project } from "@/types";

type DbProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type DbProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

const PROJECT_FIELDS = [
  "id",
  "user_id",
  "client_id",
  "name",
  "budget_type",
  "hourly_rate",
  "budget_total",
  "status",
] as const satisfies readonly (keyof DbProjectRow)[];

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
    .select(PROJECT_FIELDS.join(","))
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    budgetType: r.budget_type,
    hourlyRate: Number(r.hourly_rate ?? 0),
    budgetTotal: Number(r.budget_total ?? 0),
    status: r.status,
  }));
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
