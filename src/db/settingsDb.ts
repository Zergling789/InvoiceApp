// src/db/settingsDb.ts
import { supabase } from "../supabaseClient";
import type { UserSettings } from "@/types";

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
    .select("*")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = data?.[0] ?? null;

  if (!row) {
    const { error: upErr } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: uid,
          name: "",
          company_name: "",
          address: "",
          tax_id: "",
          default_vat_rate: 19,
          default_payment_terms: 14,
          iban: "",
          bic: "",
          bank_name: "",
          email: "",
          email_default_subject: "Dokument {nummer}",
          email_default_text: "Bitte im Anhang finden Sie das Dokument.",
          logo_url: "",
          primary_color: "#4f46e5",
          template_id: "default",
          locale: "de-DE",
          currency: "EUR",
          prefix_invoice: "RE",
          prefix_offer: "ANG",
          number_padding: 4,
          footer_text: "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

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
      logoUrl: "",
      primaryColor: "#4f46e5",
      templateId: "default",
      locale: "de-DE",
      currency: "EUR",
      prefixInvoice: "RE",
      prefixOffer: "ANG",
      numberPadding: 4,
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
    defaultPaymentTerms: Number(row.default_payment_terms ?? 14),
    iban: row.iban ?? "",
    bic: row.bic ?? "",
    bankName: row.bank_name ?? "",
    email: row.email ?? "",
    emailDefaultSubject: (row as any).email_default_subject ?? "Dokument {nummer}",
    emailDefaultText: (row as any).email_default_text ?? "Bitte im Anhang finden Sie das Dokument.",
    logoUrl: (row as any).logo_url ?? "",
    primaryColor: (row as any).primary_color ?? "#4f46e5",
    templateId: (row as any).template_id ?? "default",
    locale: (row as any).locale ?? "de-DE",
    currency: (row as any).currency ?? "EUR",
    prefixInvoice: (row as any).prefix_invoice ?? "RE",
    prefixOffer: (row as any).prefix_offer ?? "ANG",
    numberPadding: Number((row as any).number_padding ?? 4),
    footerText: (row as any).footer_text ?? "",
    defaultSenderIdentityId: (row as any).default_sender_identity_id ?? null,
  };
}

export async function dbSaveSettings(s: UserSettings): Promise<void> {
  const uid = await requireUserId();

  const payload = {
    user_id: uid,
    name: s.name ?? "",
    company_name: s.companyName ?? "",
    address: s.address ?? "",
    tax_id: s.taxId ?? "",
    default_vat_rate: Number(s.defaultVatRate ?? 19),
    default_payment_terms: Number(s.defaultPaymentTerms ?? 14),
    iban: s.iban ?? "",
    bic: s.bic ?? "",
    bank_name: s.bankName ?? "",
    email: s.email ?? "",
    email_default_subject: s.emailDefaultSubject ?? "Dokument {nummer}",
    email_default_text: s.emailDefaultText ?? "Bitte im Anhang finden Sie das Dokument.",
    logo_url: s.logoUrl ?? "",
    primary_color: s.primaryColor ?? "#4f46e5",
    template_id: s.templateId ?? "default",
    locale: s.locale ?? "de-DE",
    currency: s.currency ?? "EUR",
    prefix_invoice: s.prefixInvoice ?? "RE",
    prefix_offer: s.prefixOffer ?? "ANG",
    number_padding: Number(s.numberPadding ?? 4),
    footer_text: s.footerText ?? "",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
