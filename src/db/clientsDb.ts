import { supabase } from "@/supabaseClient";
import type { Client } from "@/types";

type DbClientRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt");
  return data.user.id;
}

function toClient(r: DbClientRow): Client {
  return {
    id: r.id,
    companyName: r.company_name ?? "",
    contactPerson: r.contact_person ?? "",
    email: r.email ?? "",
    address: r.address ?? "",
    notes: r.notes ?? "",
  };
}

function toPayload(uid: string, c: Client) {
  return {
    id: c.id,
    user_id: uid,
    company_name: c.companyName,
    contact_person: c.contactPerson || null,
    email: c.email || null,
    address: c.address || null,
    notes: c.notes || null,
    updated_at: new Date().toISOString(),
  };
}

// ---------- LIST ----------
export async function dbListClients(): Promise<Client[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", uid)
    .order("company_name", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as DbClientRow[]).map(toClient);
}

// ---------- GET ----------
export async function dbGetClientById(id: string): Promise<Client | null> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? toClient(data as DbClientRow) : null;
}

// ---------- UPSERT ----------
export async function dbUpsertClient(c: Client): Promise<void> {
  const uid = await requireUserId();

  const { error } = await supabase
    .from("clients")
    .upsert(toPayload(uid, c), { onConflict: "id" });

  if (error) throw new Error(error.message);
}

// ---------- DELETE ----------
export async function dbDeleteClient(id: string): Promise<void> {
  const uid = await requireUserId();

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);

  if (error) throw new Error(error.message);
}

// Backwards-compatible Aliases (falls irgendwo noch ohne db* importiert wird)
export const listClients = dbListClients;
export const upsertClient = dbUpsertClient;
export const deleteClient = dbDeleteClient;
