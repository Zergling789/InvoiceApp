import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";
import { OfferStatus } from "@/types";
import type { Offer } from "@/types";
import {
  buildDescendingCursorFilter,
  createCursorPage,
  normalizePageSize,
  type CursorPage,
  type DocumentPageOptions,
} from "@/db/cursorPagination";

type DbOfferRow = Database["public"]["Tables"]["offers"]["Row"];
type DbOfferInsert = Database["public"]["Tables"]["offers"]["Insert"];

const OFFER_FIELDS =
  "id,created_at,updated_at,number,client_id,project_id,currency,date,valid_until,positions,intro_text,footer_text,vat_rate,status,rejection_reason,sent_at,last_sent_at,last_sent_to,sent_count,sent_via,invoice_id" as const;

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

const toOffer = (r: DbOfferRow): Offer => ({
  id: r.id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  number: r.number,
  clientId: r.client_id,
  projectId: r.project_id ?? undefined,
  currency: r.currency ?? "EUR",
  date: r.date,
  validUntil: r.valid_until ?? "",
  positions: (Array.isArray(r.positions) ? r.positions : []) as unknown as Offer["positions"],
  introText: r.intro_text ?? "",
  footerText: r.footer_text ?? "",
  vatRate: Number(r.vat_rate ?? 0),
  status: normalizeOfferStatus(r.status),
  sentAt: r.sent_at ?? null,
  lastSentAt: r.last_sent_at ?? null,
  lastSentTo: r.last_sent_to ?? null,
  sentCount: Number(r.sent_count ?? 0),
  sentVia: (r.sent_via as Offer["sentVia"]) ?? null,
  invoiceId: r.invoice_id ?? null,
  rejectionReason: r.rejection_reason ?? null,
});

// ---------- LIST ----------
export async function dbListOffers(): Promise<Offer[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as DbOfferRow[]).map(toOffer);
}

export async function dbListOffersForProject(projectId: string): Promise<Offer[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_FIELDS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbOfferRow[]).map(toOffer);
}

export async function dbListOffersPage(
  options: DocumentPageOptions = {},
): Promise<CursorPage<Offer>> {
  const uid = await requireUserId();
  const pageSize = normalizePageSize(options.pageSize);
  const hasFilters = Boolean(options.search?.trim() || options.phases?.length);

  if (hasFilters) {
    const { data, error } = await supabase
      .rpc("list_offer_documents_page", {
        p_search: options.search?.trim().slice(0, 100) || null,
        p_client_ids: null,
        p_phases: options.phases?.length ? options.phases : null,
        p_cursor_created_at: options.cursor?.createdAt ?? null,
        p_cursor_id: options.cursor?.id ?? null,
        p_limit: pageSize + 1,
      })
      .overrideTypes<DbOfferRow[], { merge: false }>();
    if (error) throw new Error(error.message);
    return createCursorPage(data ?? [], pageSize, toOffer);
  }

  let query = supabase
    .from("offers")
    .select(OFFER_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.cursor) {
    query = query.or(buildDescendingCursorFilter(options.cursor));
  }

  const { data, error } = await query.limit(pageSize + 1);
  if (error) throw new Error(error.message);

  return createCursorPage((data ?? []) as DbOfferRow[], pageSize, toOffer);
}

// ---------- GET ----------
export async function dbGetOffer(id: string): Promise<Offer> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_FIELDS)
    .eq("id", id)
    .eq("user_id", uid)
    .single();

  if (error) throw new Error(error.message);

  return toOffer(data as DbOfferRow);
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

    positions: (o.positions ?? []) as unknown as Database["public"]["Tables"]["offers"]["Insert"]["positions"],
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
    rejection_reason: o.rejectionReason ?? null,

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
