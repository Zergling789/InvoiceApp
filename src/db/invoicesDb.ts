import { supabase } from "@/supabaseClient";
import { InvoiceStatus } from "@/types";
import type { Invoice } from "@/types";

const normalizeInvoiceStatus = (status: string | null | undefined): InvoiceStatus => {
  switch ((status ?? "").toUpperCase()) {
    case InvoiceStatus.ISSUED:
      return InvoiceStatus.ISSUED;
    case InvoiceStatus.SENT:
      return InvoiceStatus.SENT;
    case InvoiceStatus.OVERDUE:
      return InvoiceStatus.OVERDUE;
    case InvoiceStatus.PAID:
      return InvoiceStatus.PAID;
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
    .select("*")
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    number: r.number,
    offerId: r.offer_id ?? undefined,
    clientId: r.client_id,
    projectId: r.project_id ?? undefined,
    date: r.date,
    dueDate: r.due_date ?? "",
    paymentDate: r.payment_date ?? undefined,
    positions: r.positions ?? [],
    introText: r.intro_text ?? "",
    footerText: r.footer_text ?? "",
    vatRate: Number(r.vat_rate ?? 0),
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
    .select("*")
    .eq("id", id)
    .eq("user_id", uid)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    number: data.number,
    offerId: data.offer_id ?? undefined,
    clientId: data.client_id,
    projectId: data.project_id ?? undefined,
    date: data.date,
    dueDate: data.due_date ?? "",
    paymentDate: data.payment_date ?? undefined,
    positions: data.positions ?? [],
    introText: data.intro_text ?? "",
    footerText: data.footer_text ?? "",
    vatRate: Number(data.vat_rate ?? 0),
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

  const payload = {
    id: inv.id,
    user_id: uid,

    number: inv.number,

    offer_id: inv.offerId ?? null,
    client_id: inv.clientId,
    project_id: inv.projectId ?? null,

    date: inv.date,
    due_date: inv.dueDate ?? null,
    payment_date: inv.paymentDate ?? null,

    positions: inv.positions ?? [],

    intro_text: (inv as any).introText ?? "",
    footer_text: (inv as any).footerText ?? "",

    vat_rate: Number(inv.vatRate ?? 0),
    status: toDbInvoiceStatus(inv.status ?? InvoiceStatus.DRAFT),
    is_locked: Boolean(inv.isLocked ?? false),
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
