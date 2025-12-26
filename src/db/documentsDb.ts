import { supabase } from "@/supabaseClient";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt");
  return data.user.id;
}

export async function dbNextNumber(type: "offer" | "invoice"): Promise<number> {
  await requireUserId();

  const { data, error } = await supabase.rpc("next_document_number", { doc_type: type });
  if (error) throw new Error(error.message);
  const next = Number(data ?? 0);
  if (!Number.isFinite(next) || next <= 0) throw new Error("Konnte naechste Nummer nicht bestimmen.");
  return next;
}
