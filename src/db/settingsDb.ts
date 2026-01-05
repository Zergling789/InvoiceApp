// src/db/settingsDb.ts
import { supabase } from "../supabaseClient";
import type { Database } from "@/lib/supabase.types";
import type { UserSettings } from "@/types";
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";

type DbSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type DbSettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];

const SETTINGS_FIELDS = [
  "user_id",
  "name",
  "company_name",
  "address",
  "tax_id",
  "default_vat_rate",
  "default_payment_terms",
  "payment_terms_days",
  "iban",
  "bic",
  "bank_name",
  "email",
  "email_default_subject",
  "email_default_text",
  "is_small_business",
  "small_business_note",
  "logo_url",
  "primary_color",
  "template_id",
  "locale",
  "currency",
  "prefix_invoice",
  "prefix_offer",
  "number_padding",
  "invoice_number_prefix",
  "invoice_number_next",
  "invoice_number_padding",
  "invoice_number_include_year",
  "footer_text",
  "default_sender_identity_id",
  "updated_at",
] as const satisfies readonly (keyof DbSettingsRow)[];

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Nicht eingeloggt. Bitte anmelden.");
  return data.user.id;
}

export async function dbGetSettings(): Promise<UserSettings> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("user_settings")
    .select(SETTINGS_FIELDS.join(","))
    .eq("user_id", uid)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row: DbSettingsRow | null = data?.[0] ?? null;

  if (!row) {
    const defaults: DbSettingsInsert = {
      user_id: uid,
      name: "",
      company_name: "",
      address: "",
      tax_id: "",
      default_vat_rate: 19,
      default_payment_terms: 14,
      payment_terms_days: 14,
      iban: "",
      bic: "",
      bank_name: "",
      email: "",
      email_default_subject: "Dokument {nummer}",
      email_default_text: "Bitte im Anhang finden Sie das Dokument.",
      is_small_business: false,
      small_business_note: SMALL_BUSINESS_DEFAULT_NOTE,
      logo_url: "",
      primary_color: "#4f46e5",
      template_id: "default",
      locale: "de-DE",
      currency: "EUR",
      prefix_invoice: "RE",
      prefix_offer: "ANG",
      number_padding: 4,
      invoice_number_prefix: "RE",
      invoice_number_next: 1,
      invoice_number_padding: 3,
      invoice_number_include_year: true,
      footer_text: "",
      updated_at: new Date().toISOString(),
    };
    const { error: upErr } = await supabase
      .from("user_settings")
      .upsert(defaults, { onConflict: "user_id" });

    if (upErr) throw new Error(upErr.message);

    return {
      name: "",
      companyName: "",
      address: "",
      taxId: "",
      defaultVatRate: 19,
      defaultPaymentTerms: 14,
      iban: "",
      bic: "",
      bankName: "",
      email: "",
      emailDefaultSubject: "Dokument {nummer}",
      emailDefaultText: "Bitte im Anhang finden Sie das Dokument.",
      isSmallBusiness: false,
      smallBusinessNote: SMALL_BUSINESS_DEFAULT_NOTE,
      logoUrl: "",
      primaryColor: "#4f46e5",
      templateId: "default",
      locale: "de-DE",
      currency: "EUR",
      prefixInvoice: "RE",
      prefixOffer: "ANG",
      numberPadding: 4,
      invoiceNumberPrefix: "RE",
      invoiceNumberNext: 1,
      invoiceNumberPadding: 3,
      invoiceNumberIncludeYear: true,
      footerText: "",
      defaultSenderIdentityId: null,
    };
  }

  return {
    name: row.name ?? "",
    companyName: row.company_name ?? "",
    address: row.address ?? "",
    taxId: row.tax_id ?? "",
    defaultVatRate: Number(row.default_vat_rate ?? 19),
    defaultPaymentTerms: Number(row.payment_terms_days ?? row.default_payment_terms ?? 14),
    iban: row.iban ?? "",
    bic: row.bic ?? "",
    bankName: row.bank_name ?? "",
    email: row.email ?? "",
    emailDefaultSubject: row.email_default_subject ?? "Dokument {nummer}",
    emailDefaultText: row.email_default_text ?? "Bitte im Anhang finden Sie das Dokument.",
    isSmallBusiness: row.is_small_business ?? false,
    smallBusinessNote: row.small_business_note ?? SMALL_BUSINESS_DEFAULT_NOTE,
    logoUrl: row.logo_url ?? "",
    primaryColor: row.primary_color ?? "#4f46e5",
    templateId: row.template_id ?? "default",
    locale: row.locale ?? "de-DE",
    currency: row.currency ?? "EUR",
    prefixInvoice: row.prefix_invoice ?? "RE",
    prefixOffer: row.prefix_offer ?? "ANG",
    numberPadding: Number(row.number_padding ?? 4),
    invoiceNumberPrefix: row.invoice_number_prefix ?? "RE",
    invoiceNumberNext: Number(row.invoice_number_next ?? 1),
    invoiceNumberPadding: Number(row.invoice_number_padding ?? 3),
    invoiceNumberIncludeYear: row.invoice_number_include_year ?? true,
    footerText: row.footer_text ?? "",
    defaultSenderIdentityId: row.default_sender_identity_id ?? null,
  };
}

export async function dbSaveSettings(s: UserSettings): Promise<void> {
  const uid = await requireUserId();
  const paymentTermsDays = Math.min(365, Math.max(0, Number(s.defaultPaymentTerms ?? 14)));

  const payload: DbSettingsInsert = {
    user_id: uid,
    name: s.name ?? "",
    company_name: s.companyName ?? "",
    address: s.address ?? "",
    tax_id: s.taxId ?? "",
    default_vat_rate: Number(s.defaultVatRate ?? 19),
    default_payment_terms: paymentTermsDays,
    payment_terms_days: paymentTermsDays,
    iban: s.iban ?? "",
    bic: s.bic ?? "",
    bank_name: s.bankName ?? "",
    email: s.email ?? "",
    email_default_subject: s.emailDefaultSubject ?? "Dokument {nummer}",
    email_default_text: s.emailDefaultText ?? "Bitte im Anhang finden Sie das Dokument.",
    is_small_business: s.isSmallBusiness ?? false,
    small_business_note: s.smallBusinessNote ?? SMALL_BUSINESS_DEFAULT_NOTE,
    logo_url: s.logoUrl ?? "",
    primary_color: s.primaryColor ?? "#4f46e5",
    template_id: s.templateId ?? "default",
    locale: s.locale ?? "de-DE",
    currency: s.currency ?? "EUR",
    prefix_invoice: s.prefixInvoice ?? "RE",
    prefix_offer: s.prefixOffer ?? "ANG",
    number_padding: Number(s.numberPadding ?? 4),
    invoice_number_prefix: s.invoiceNumberPrefix ?? "RE",
    invoice_number_next: Number(s.invoiceNumberNext ?? 1),
    invoice_number_padding: Number(s.invoiceNumberPadding ?? 3),
    invoice_number_include_year: s.invoiceNumberIncludeYear ?? true,
    footer_text: s.footerText ?? "",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
