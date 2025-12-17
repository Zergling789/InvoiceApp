import { supabase } from "@/supabaseClient";
import { OfferStatus } from "@/types";
import type { Offer } from "@/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const user = data.session?.user;
  if (!user) throw new Error("Nicht eingeloggt");

  return user.id;
}

// ---------- LIST ----------
export async function dbListOffers(): Promise<Offer[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    number: r.number,
    clientId: r.client_id,
    projectId: r.project_id ?? undefined,
    date: r.date,
    validUntil: r.valid_until ?? "",
    positions: r.positions ?? [],
    introText: r.intro_text ?? "",
    footerText: r.footer_text ?? "",
    vatRate: Number(r.vat_rate ?? 0),
    status: (r.status ?? OfferStatus.DRAFT) as any,
  }));
}

// ---------- GET ----------
export async function dbGetOffer(id: string): Promise<Offer> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    number: data.number,
    clientId: data.client_id,
    projectId: data.project_id ?? undefined,
    date: data.date,
    validUntil: data.valid_until ?? "",
    positions: data.positions ?? [],
    introText: data.intro_text ?? "",
    footerText: data.footer_text ?? "",
    vatRate: Number(data.vat_rate ?? 0),
    status: (data.status ?? OfferStatus.DRAFT) as any,
  };
}

// ---------- UPSERT ----------
export async function dbUpsertOffer(o: Offer): Promise<void> {
  const uid = await requireUserId();

  const payload = {
    id: o.id,
    user_id: uid,

    number: o.number,
    client_id: o.clientId,
    project_id: o.projectId ?? null,

    date: o.date,
    valid_until: o.validUntil ?? null,

    positions: o.positions ?? [],
    intro_text: o.introText ?? "",
    footer_text: o.footerText ?? "",

    vat_rate: Number((o as any).vatRate ?? 0),
    status: (o.status ?? OfferStatus.DRAFT) as any,

    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("offers").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

// ---------- DELETE ----------
export async function dbDeleteOffer(id: string): Promise<void> {
  const uid = await requireUserId();

  const { error } = await supabase.from("offers").delete().eq("id", id).eq("user_id", uid);
  if (error) throw new Error(error.message);
}

// Backwards-compatible Aliases
export const listOffers = dbListOffers;
export const upsertOffer = dbUpsertOffer;
export const deleteOffer = dbDeleteOffer;
