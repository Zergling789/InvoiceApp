import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";
import { InvoiceStatus } from "@/types";
import type { Invoice } from "@/types";

type DbInvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type DbInvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

const INVOICE_FIELDS = [
  "id",
  "invoice_number",
  "number",
  "offer_id",
  "client_id",
  "project_id",
  "date",
  "due_date",
  "payment_date",
  "paid_at",
  "canceled_at",
  "issued_at",
  "positions",
  "intro_text",
  "footer_text",
  "vat_rate",
  "is_small_business",
  "small_business_note",
  "status",
  "is_locked",
  "finalized_at",
  "sent_at",
  "last_sent_at",
  "last_sent_to",
  "sent_count",
  "sent_via",
] as const satisfies readonly (keyof DbInvoiceRow)[];

const normalizeInvoiceStatus = (status: string | null | undefined): InvoiceStatus => {
  switch ((status ?? "").toUpperCase()) {
    case InvoiceStatus.ISSUED:
      return InvoiceStatus.ISSUED;
    case InvoiceStatus.SENT:
      return InvoiceStatus.SENT;
    case InvoiceStatus.PAID:
      return InvoiceStatus.PAID;
    case InvoiceStatus.CANCELED:
      return InvoiceStatus.CANCELED;
    case InvoiceStatus.DRAFT:
    default:
      return InvoiceStatus.DRAFT;
  }
};

const toDbInvoiceStatus = (status: InvoiceStatus | null | undefined): string =>
  normalizeInvoiceStatus(status ?? InvoiceStatus.DRAFT);

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const user = data.session?.user;
  if (!user) throw new Error("Nicht eingeloggt");

  return user.id;
}

// ---------- LIST ----------
export async function dbListInvoices(): Promise<Invoice[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_FIELDS.join(","))
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    number: r.invoice_number ?? r.number ?? null,
    offerId: r.offer_id ?? undefined,
    clientId: r.client_id,
    projectId: r.project_id ?? undefined,
    date: r.date,
    dueDate: r.due_date ?? "",
    paymentDate: r.payment_date ?? undefined,
    paidAt: r.paid_at ?? null,
    canceledAt: r.canceled_at ?? null,
    issuedAt: r.issued_at ?? null,
    positions: r.positions ?? [],
    introText: r.intro_text ?? "",
    footerText: r.footer_text ?? "",
    vatRate: Number(r.vat_rate ?? 0),
    isSmallBusiness: Boolean(r.is_small_business ?? false),
    smallBusinessNote: r.small_business_note ?? null,
    status: normalizeInvoiceStatus(r.status),
    isLocked: Boolean(r.is_locked ?? false),
    finalizedAt: r.finalized_at ?? null,
    sentAt: r.sent_at ?? null,
    lastSentAt: r.last_sent_at ?? null,
    lastSentTo: r.last_sent_to ?? null,
    sentCount: Number(r.sent_count ?? 0),
    sentVia: r.sent_via ?? null,
  }));
}

// ---------- GET ----------
export async function dbGetInvoice(id: string): Promise<Invoice> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_FIELDS.join(","))
    .eq("id", id)
    .eq("user_id", uid)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    number: data.invoice_number ?? data.number ?? null,
    offerId: data.offer_id ?? undefined,
    clientId: data.client_id,
    projectId: data.project_id ?? undefined,
    date: data.date,
    dueDate: data.due_date ?? "",
    paymentDate: data.payment_date ?? undefined,
    paidAt: data.paid_at ?? null,
    canceledAt: data.canceled_at ?? null,
    issuedAt: data.issued_at ?? null,
    positions: data.positions ?? [],
    introText: data.intro_text ?? "",
    footerText: data.footer_text ?? "",
    vatRate: Number(data.vat_rate ?? 0),
    isSmallBusiness: Boolean(data.is_small_business ?? false),
    smallBusinessNote: data.small_business_note ?? null,
    status: normalizeInvoiceStatus(data.status),
    isLocked: Boolean(data.is_locked ?? false),
    finalizedAt: data.finalized_at ?? null,
    sentAt: data.sent_at ?? null,
    lastSentAt: data.last_sent_at ?? null,
    lastSentTo: data.last_sent_to ?? null,
    sentCount: Number(data.sent_count ?? 0),
    sentVia: data.sent_via ?? null,
  };
}

// ---------- UPSERT ----------
export async function dbUpsertInvoice(inv: Invoice): Promise<void> {
  const uid = await requireUserId();

  const isDraft = inv.status === InvoiceStatus.DRAFT;
  const payload: DbInvoiceInsert = {
    id: inv.id,
    user_id: uid,
    number: inv.number ?? undefined,

    offer_id: inv.offerId ?? null,
    client_id: inv.clientId,
    project_id: inv.projectId ?? null,

    date: inv.date,
    due_date: inv.dueDate ?? null,
    payment_date: inv.paymentDate ?? null,
    paid_at: inv.paidAt ?? null,
    canceled_at: inv.canceledAt ?? null,
    issued_at: inv.issuedAt ?? null,

    positions: inv.positions ?? [],

    intro_text: (inv as any).introText ?? "",
    footer_text: (inv as any).footerText ?? "",

    vat_rate: Number(inv.vatRate ?? 0),
    is_small_business: Boolean(inv.isSmallBusiness ?? false),
    small_business_note: inv.smallBusinessNote ?? null,
    status: isDraft ? toDbInvoiceStatus(inv.status ?? InvoiceStatus.DRAFT) : undefined,
    is_locked: isDraft ? Boolean(inv.isLocked ?? false) : undefined,
    finalized_at: inv.finalizedAt ?? null,
    sent_at: inv.sentAt ?? null,
    last_sent_at: inv.lastSentAt ?? null,
    last_sent_to: inv.lastSentTo ?? null,
    sent_count: Number(inv.sentCount ?? 0),
    sent_via: inv.sentVia ?? null,

    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("invoices").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

// ---------- DELETE ----------
export async function dbDeleteInvoice(id: string): Promise<void> {
  const uid = await requireUserId();

  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("user_id", uid);
  if (error) throw new Error(error.message);
}

// Backwards-compatible Aliases
export const listInvoices = dbListInvoices;
export const upsertInvoice = dbUpsertInvoice;
export const deleteInvoice = dbDeleteInvoice;
