import { supabase } from "@/supabaseClient";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt");
  return data.user.id;
}

function extractTrailingNumber(value: unknown): number | null {
  const s = String(value ?? "");
  const m = s.match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export async function dbNextNumber(type: "offer" | "invoice"): Promise<number> {
  const uid = await requireUserId();
  const table = type === "offer" ? "offers" : "invoices";

  const { data, error } = await supabase
    .from(table)
    .select("number")
    .eq("user_id", uid)
    .order("date", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const numbers = (data ?? [])
    .map((r: any) => extractTrailingNumber(r.number))
    .filter((n: number | null): n is number => n !== null);

  const max = numbers.length ? Math.max(...numbers) : 0;
  return max + 1;
}
