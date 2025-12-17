// src/db/timeEntriesDb.ts
import { supabase } from "@/supabaseClient";
import type { TimeEntry } from "@/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt. Bitte anmelden.");
  return data.user.id;
}

export async function dbListTimeEntries(): Promise<TimeEntry[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("time_entries")
    .select("id, user_id, project_id, date, hours, description")
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    projectId: r.project_id,
    date: r.date,
    hours: Number(r.hours ?? 0),
    description: r.description ?? "",
  }));
}

export async function dbInsertTimeEntry(t: TimeEntry): Promise<void> {
  const uid = await requireUserId();

  const payload = {
    id: t.id,
    user_id: uid,
    project_id: t.projectId,
    date: t.date.slice(0, 10),
    hours: t.hours,
    description: t.description ?? "",
  };

  const { error } = await supabase.from("time_entries").insert(payload);
  if (error) throw new Error(error.message);
}
