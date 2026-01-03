import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";

type DocumentActivityRow = Database["public"]["Tables"]["document_activity"]["Row"];

type DocumentActivityEvent = Pick<
  DocumentActivityRow,
  "id" | "event_type" | "meta" | "created_at"
>;

const ACTIVITY_FIELDS = ["id", "event_type", "meta", "created_at"] as const satisfies readonly (
  keyof DocumentActivityRow
)[];

export async function dbListDocumentActivity(
  docType: "offer" | "invoice",
  docId: string
): Promise<DocumentActivityEvent[]> {
  const { data, error } = await supabase
    .from("document_activity")
    .select(ACTIVITY_FIELDS.join(","))
    .eq("doc_type", docType)
    .eq("doc_id", docId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
}
