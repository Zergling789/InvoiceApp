import { supabase } from "@/supabaseClient";
import type { FeedbackEntry } from "@/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const user = data.session?.user;
  if (!user) throw new Error("Nicht eingeloggt");

  return user.id;
}

export async function dbListFeedback(): Promise<FeedbackEntry[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    subject: row.subject,
    message: row.message,
    rating: row.rating ?? null,
    createdAt: row.created_at,
  }));
}

export async function dbCreateFeedback(entry: {
  subject: string;
  message: string;
  rating?: number | null;
}): Promise<FeedbackEntry> {
  const uid = await requireUserId();

  const payload = {
    user_id: uid,
    subject: entry.subject,
    message: entry.message,
    rating: entry.rating ?? null,
  };

  const { data, error } = await supabase.from("feedback").insert(payload).select("*").single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Feedback konnte nicht gespeichert werden.");

  return {
    id: data.id,
    subject: data.subject,
    message: data.message,
    rating: data.rating ?? null,
    createdAt: data.created_at,
  };
}
