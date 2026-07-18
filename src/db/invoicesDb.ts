import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";
import { InvoiceStatus } from "@/types";
import type { Invoice } from "@/types";
import { calcDueDate } from "@/domain/rules/invoiceRules";
import {
  buildDescendingCursorFilter,
  createCursorPage,
  normalizePageSize,
  type CursorPage,
  type CursorPageOptions,
} from "@/db/cursorPagination";

type DbInvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type DbInvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

const INVOICE_FIELDS =
  "id,created_at,invoice_number,number,offer_id,client_id,client_name,client_company_name,client_contact_person,client_email,client_phone,client_vat_id,client_address,client_street,client_house_number,client_postal_code,client_city,client_electronic_address,client_electronic_address_scheme,project_id,date,invoice_date,service_date,service_period_start,service_period_end,seller_country,customer_country,customer_type,service_country,currency,buyer_reference,payment_terms_days,due_date,payment_date,paid_at,canceled_at,positions,intro_text,footer_text,vat_rate,is_small_business,small_business_note,status,is_locked,finalized_at,sent_at,last_sent_at,last_sent_to,sent_count,sent_via" as const;

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

const computeIsOverdue = (row: {
  status: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  canceled_at?: string | null;
}) => {
  const status = (row.status ?? "").toUpperCase();
  if (!["ISSUED", "SENT"].includes(status)) return false;
  if (row.paid_at || row.canceled_at) return false;
  if (!row.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(row.due_date);
  return due.getTime() < today.getTime();
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const user = data.session?.user;
  if (!user) throw new Error("Nicht eingeloggt");

  return user.id;
}

const toInvoice = (r: DbInvoiceRow): Invoice => ({
  id: r.id,
  createdAt: r.created_at,
  number: r.invoice_number ?? r.number ?? null,
  offerId: r.offer_id ?? undefined,
  clientId: r.client_id,
  clientName: r.client_name ?? "",
  clientCompanyName: r.client_company_name ?? null,
  clientContactPerson: r.client_contact_person ?? null,
  clientEmail: r.client_email ?? null,
  clientPhone: r.client_phone ?? null,
  clientVatId: r.client_vat_id ?? null,
  clientAddress: r.client_address ?? null,
  clientStreet: r.client_street,
  clientHouseNumber: r.client_house_number,
  clientPostalCode: r.client_postal_code,
  clientCity: r.client_city,
  clientElectronicAddress: r.client_electronic_address,
  clientElectronicAddressScheme: r.client_electronic_address_scheme,
  projectId: r.project_id ?? undefined,
  date: r.invoice_date ?? r.date,
  serviceDate: r.service_date ?? undefined,
  servicePeriodStart: r.service_period_start ?? undefined,
  servicePeriodEnd: r.service_period_end ?? undefined,
  sellerCountry: r.seller_country ?? "DE",
  customerCountry: r.customer_country ?? "DE",
  customerType: r.customer_type === "PRIVATE" ? "PRIVATE" : "BUSINESS",
  serviceCountry: r.service_country ?? "DE",
  currency: r.currency ?? "EUR",
  buyerReference: r.buyer_reference ?? undefined,
  paymentTermsDays: Number(r.payment_terms_days ?? 14),
  dueDate: r.due_date ?? "",
  paymentDate: r.payment_date ?? undefined,
  paidAt: r.paid_at ?? null,
  canceledAt: r.canceled_at ?? null,
  isOverdue: computeIsOverdue(r),
  positions: (Array.isArray(r.positions) ? r.positions : []) as unknown as Invoice["positions"],
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
  sentVia: (r.sent_via as Invoice["sentVia"]) ?? null,
});

// ---------- LIST ----------
export async function dbListInvoices(): Promise<Invoice[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as DbInvoiceRow[]).map(toInvoice);
}

export async function dbListInvoicesPage(
  options: CursorPageOptions = {},
): Promise<CursorPage<Invoice>> {
  const uid = await requireUserId();
  const pageSize = normalizePageSize(options.pageSize);
  let query = supabase
    .from("invoices")
    .select(INVOICE_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.cursor) {
    query = query.or(buildDescendingCursorFilter(options.cursor));
  }

  const { data, error } = await query.limit(pageSize + 1);
  if (error) throw new Error(error.message);

  return createCursorPage((data ?? []) as DbInvoiceRow[], pageSize, toInvoice);
}

// ---------- GET ----------
export async function dbGetInvoice(id: string): Promise<Invoice> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_FIELDS)
    .eq("id", id)
    .eq("user_id", uid)
    .single();

  if (error) throw new Error(error.message);

  return toInvoice(data as DbInvoiceRow);
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
    client_name: isDraft ? inv.clientName ?? "" : undefined,
    client_company_name: isDraft ? inv.clientCompanyName ?? null : undefined,
    client_contact_person: isDraft ? inv.clientContactPerson ?? null : undefined,
    client_email: isDraft ? inv.clientEmail ?? null : undefined,
    client_phone: isDraft ? inv.clientPhone ?? null : undefined,
    client_vat_id: isDraft ? inv.clientVatId ?? null : undefined,
    client_address: isDraft ? inv.clientAddress ?? null : undefined,
    client_street: isDraft ? inv.clientStreet ?? null : undefined, client_house_number: isDraft ? inv.clientHouseNumber ?? null : undefined, client_postal_code: isDraft ? inv.clientPostalCode ?? null : undefined, client_city: isDraft ? inv.clientCity ?? null : undefined, client_electronic_address: isDraft ? inv.clientElectronicAddress ?? null : undefined, client_electronic_address_scheme: isDraft ? inv.clientElectronicAddressScheme ?? "EM" : undefined,
    project_id: inv.projectId ?? null,

    date: inv.date,
    invoice_date: inv.date,
    service_date: inv.serviceDate || null,
    service_period_start: inv.servicePeriodStart || null,
    service_period_end: inv.servicePeriodEnd || null,
    seller_country: inv.sellerCountry, customer_country: inv.customerCountry, customer_type: inv.customerType, service_country: inv.serviceCountry, currency: inv.currency, buyer_reference: inv.buyerReference || null,
    payment_terms_days: Number(inv.paymentTermsDays ?? 14),
    due_date: inv.dueDate || calcDueDate(inv.date, Number(inv.paymentTermsDays ?? 14)),
    payment_date: inv.paymentDate ?? null,
    paid_at: inv.paidAt ?? null,
    canceled_at: inv.canceledAt ?? null,

    positions: (inv.positions ?? []) as unknown as Database["public"]["Tables"]["invoices"]["Insert"]["positions"],

    intro_text: inv.introText ?? "",
    footer_text: inv.footerText ?? "",

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
  if (error) {
    const err = new Error(error.message);
    (err as Error & { code?: string }).code = error.message;
    throw err;
  }

  if (isDraft && inv.clientId) {
    const { error: snapshotError } = await supabase.rpc("copy_customer_snapshot_to_invoice", {
      p_invoice_id: inv.id,
    });
    if (snapshotError) {
      const err = new Error(snapshotError.message);
      (err as Error & { code?: string }).code = snapshotError.message;
      throw err;
    }
  }
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
