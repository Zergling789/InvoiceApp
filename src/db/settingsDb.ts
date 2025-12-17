// src/db/settingsDb.ts
import { supabase } from "../supabaseClient";
import type { UserSettings } from "../types";

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
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
