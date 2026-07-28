import { supabase } from "@/supabaseClient";
import type { Database } from "@/lib/supabase.types";
import type { Client } from "@/types";
import type { ClientSummary } from "@/domain/models/Client";
import {
  buildDescendingCursorFilter,
  buildIlikeAnyFilter,
  createCursorPage,
  normalizePageSize,
  type CursorPage,
  type CursorPageOptions,
} from "@/db/cursorPagination";

type DbClientRow = Database["public"]["Tables"]["clients"]["Row"];
type DbClientInsert = Database["public"]["Tables"]["clients"]["Insert"];

const CLIENT_FIELDS =
  "id,organization_id,user_id,company_name,contact_person,email,address,notes,customer_number,first_name,last_name,job_title,department,phone,mobile,website,street,house_number,address_addition,postal_code,city,state,country,legal_form,industry,vat_id,tax_number,registration_number,invoice_email,billing_address,payment_terms_days,currency,default_vat_rate,preferred_language,preferred_delivery_method,source,tags,last_contact_at,next_follow_up_at,updated_at,created_at" as const;
const CLIENT_SUMMARY_FIELDS = "id,company_name,contact_person,first_name,last_name" as const;
const CLIENT_PAGE_FIELDS =
  "id,created_at,company_name,contact_person,email,address,customer_number,first_name,last_name,phone,mobile,street,house_number,postal_code,city" as const;

export type ClientPageOptions = CursorPageOptions & { search?: string };

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt");
  return data.user.id;
}

function toClient(r: DbClientRow): Client {
  return {
    id: r.id,
    createdAt: r.created_at,
    companyName: r.company_name ?? "",
    contactPerson: r.contact_person ?? "",
    email: r.email ?? "",
    address: r.address ?? "",
    notes: r.notes ?? "",
    customerNumber: r.customer_number ?? "", firstName: r.first_name ?? "", lastName: r.last_name ?? "",
    jobTitle: r.job_title ?? "", department: r.department ?? "", phone: r.phone ?? "", mobile: r.mobile ?? "", website: r.website ?? "",
    street: r.street ?? "", houseNumber: r.house_number ?? "", addressAddition: r.address_addition ?? "", postalCode: r.postal_code ?? "", city: r.city ?? "", state: r.state ?? "", country: r.country ?? "Deutschland",
    legalForm: r.legal_form ?? "", industry: r.industry ?? "", vatId: r.vat_id ?? "", taxNumber: r.tax_number ?? "", registrationNumber: r.registration_number ?? "",
    invoiceEmail: r.invoice_email ?? "", billingAddress: r.billing_address ?? "", paymentTermsDays: r.payment_terms_days, currency: r.currency ?? "", defaultVatRate: r.default_vat_rate === null ? null : Number(r.default_vat_rate),
    preferredLanguage: r.preferred_language ?? "de", preferredDeliveryMethod: (r.preferred_delivery_method as Client["preferredDeliveryMethod"]) ?? "email", source: r.source ?? "", tags: r.tags ?? [], lastContactAt: r.last_contact_at, nextFollowUpAt: r.next_follow_up_at,
  };
}

function toPayload(uid: string, c: Client): DbClientInsert {
  return {
    id: c.id,
    user_id: uid,
    company_name: c.companyName,
    contact_person: c.contactPerson || null,
    email: c.email || null,
    address: c.address || null,
    notes: c.notes || null,
    customer_number: c.customerNumber || null, first_name: c.firstName || null, last_name: c.lastName || null,
    job_title: c.jobTitle || null, department: c.department || null, phone: c.phone || null, mobile: c.mobile || null, website: c.website || null,
    street: c.street || null, house_number: c.houseNumber || null, address_addition: c.addressAddition || null, postal_code: c.postalCode || null, city: c.city || null, state: c.state || null, country: c.country || null,
    legal_form: c.legalForm || null, industry: c.industry || null, vat_id: c.vatId || null, tax_number: c.taxNumber || null, registration_number: c.registrationNumber || null,
    invoice_email: c.invoiceEmail || null, billing_address: c.billingAddress || null, payment_terms_days: c.paymentTermsDays ?? null, currency: c.currency || null, default_vat_rate: c.defaultVatRate ?? null,
    preferred_language: c.preferredLanguage || null, preferred_delivery_method: c.preferredDeliveryMethod || null, source: c.source || null, tags: c.tags ?? [], last_contact_at: c.lastContactAt ?? null, next_follow_up_at: c.nextFollowUpAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ---------- LIST ----------
export async function dbListClients(): Promise<Client[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_FIELDS)
    .eq("user_id", uid)
    .order("company_name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(toClient);
}

export async function dbListClientSummaries(): Promise<ClientSummary[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SUMMARY_FIELDS)
    .eq("user_id", uid)
    .order("company_name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    companyName: row.company_name ?? "",
    contactPerson: row.contact_person ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
  }));
}

export async function dbListClientsPage(
  options: ClientPageOptions = {},
): Promise<CursorPage<Client>> {
  const uid = await requireUserId();
  const pageSize = normalizePageSize(options.pageSize);
  let query = supabase
    .from("clients")
    .select(CLIENT_PAGE_FIELDS)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.search?.trim()) {
    query = query.or(
      buildIlikeAnyFilter(
        [
          "company_name",
          "contact_person",
          "first_name",
          "last_name",
          "customer_number",
          "email",
          "phone",
          "mobile",
          "city",
        ],
        options.search,
      ),
    );
  }
  if (options.cursor) {
    query = query.or(buildDescendingCursorFilter(options.cursor));
  }

  const { data, error } = await query.limit(pageSize + 1);
  if (error) throw new Error(error.message);

  return createCursorPage((data ?? []) as DbClientRow[], pageSize, toClient);
}

// ---------- GET ----------
export async function dbGetClientById(id: string): Promise<Client | null> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_FIELDS)
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? toClient(data) : null;
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
export const listClientSummaries = dbListClientSummaries;
export const upsertClient = dbUpsertClient;
export const deleteClient = dbDeleteClient;
