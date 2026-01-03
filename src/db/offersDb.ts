import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";
import { OfferStatus } from "@/types";
import type { Offer } from "@/types";

type DbOfferRow = Database["public"]["Tables"]["offers"]["Row"];
type DbOfferInsert = Database["public"]["Tables"]["offers"]["Insert"];

const OFFER_FIELDS = [
  "id",
  "number",
  "client_id",
  "project_id",
  "currency",
  "date",
  "valid_until",
  "positions",
  "intro_text",
  "footer_text",
  "vat_rate",
  "status",
  "sent_at",
  "last_sent_at",
  "last_sent_to",
  "sent_count",
  "sent_via",
  "invoice_id",
] as const satisfies readonly (keyof DbOfferRow)[];

const normalizeOfferStatus = (status: string | null | undefined): OfferStatus => {
  switch ((status ?? "").toUpperCase()) {
    case OfferStatus.SENT:
      return OfferStatus.SENT;
    case OfferStatus.ACCEPTED:
      return OfferStatus.ACCEPTED;
    case OfferStatus.REJECTED:
      return OfferStatus.REJECTED;
    case OfferStatus.INVOICED:
      return OfferStatus.INVOICED;
    case OfferStatus.DRAFT:
    default:
      return OfferStatus.DRAFT;
  }
};

const toDbOfferStatus = (status: OfferStatus | null | undefined): string =>
  normalizeOfferStatus(status ?? OfferStatus.DRAFT);

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
    .select(OFFER_FIELDS.join(","))
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    number: r.number,
    clientId: r.client_id,
    projectId: r.project_id ?? undefined,
    currency: r.currency ?? "EUR",
    date: r.date,
    validUntil: r.valid_until ?? "",
    positions: r.positions ?? [],
    introText: r.intro_text ?? "",
    footerText: r.footer_text ?? "",
    vatRate: Number(r.vat_rate ?? 0),
    status: normalizeOfferStatus(r.status),
    sentAt: r.sent_at ?? null,
    lastSentAt: r.last_sent_at ?? null,
    lastSentTo: r.last_sent_to ?? null,
    sentCount: Number(r.sent_count ?? 0),
    sentVia: r.sent_via ?? null,
    invoiceId: r.invoice_id ?? null,
  }));
}

// ---------- GET ----------
export async function dbGetOffer(id: string): Promise<Offer> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_FIELDS.join(","))
    .eq("id", id)
    .eq("user_id", uid)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    number: data.number,
    clientId: data.client_id,
    projectId: data.project_id ?? undefined,
    currency: data.currency ?? "EUR",
    date: data.date,
    validUntil: data.valid_until ?? "",
    positions: data.positions ?? [],
    introText: data.intro_text ?? "",
    footerText: data.footer_text ?? "",
    vatRate: Number(data.vat_rate ?? 0),
    status: normalizeOfferStatus(data.status),
    sentAt: data.sent_at ?? null,
    lastSentAt: data.last_sent_at ?? null,
    lastSentTo: data.last_sent_to ?? null,
    sentCount: Number(data.sent_count ?? 0),
    sentVia: data.sent_via ?? null,
    invoiceId: data.invoice_id ?? null,
  };
}

// ---------- UPSERT ----------
export async function dbUpsertOffer(o: Offer): Promise<void> {
  const uid = await requireUserId();

  const payload: DbOfferInsert = {
    id: o.id,
    user_id: uid,

    number: o.number,
    client_id: o.clientId,
    project_id: o.projectId ?? null,
    currency: o.currency ?? "EUR",

    date: o.date,
    valid_until: o.validUntil ?? null,

    positions: o.positions ?? [],
    intro_text: o.introText ?? "",
    footer_text: o.footerText ?? "",

    vat_rate: Number((o as any).vatRate ?? 0),
    status: toDbOfferStatus(o.status ?? OfferStatus.DRAFT),
    sent_at: o.sentAt ?? null,
    last_sent_at: o.lastSentAt ?? null,
    last_sent_to: o.lastSentTo ?? null,
    sent_count: Number(o.sentCount ?? 0),
    sent_via: o.sentVia ?? null,
    invoice_id: o.invoiceId ?? null,

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
