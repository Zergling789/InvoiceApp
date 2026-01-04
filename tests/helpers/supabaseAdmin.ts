import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE =
  process.env.E2E_SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error(
    "Missing Supabase admin env. Set E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE."
  );
}

export const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type TestUser = {
  id: string;
  email: string;
  password: string;
};

export async function createTestUser(): Promise<TestUser> {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = `Test-${Math.random().toString(36).slice(2)}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw error ?? new Error("Failed to create test user.");
  }
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId);
}

export async function createSenderIdentity(userId: string) {
  const { data, error } = await admin
    .from("sender_identities")
    .insert({
      user_id: userId,
      email: `sender-${Math.random().toString(16).slice(2)}@example.com`,
      display_name: "Test Sender",
      status: "verified",
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error("Failed to create sender identity.");
  }
  return data.id as string;
}

export async function seedUserSettings({
  userId,
  senderIdentityId,
}: {
  userId: string;
  senderIdentityId: string;
}) {
  const { error } = await admin.from("user_settings").upsert(
    {
      user_id: userId,
      name: "E2E User",
      company_name: "E2E Studio",
      address: "Teststrasse 1\n12345 Teststadt",
      tax_id: "DE123456789",
      default_vat_rate: 19,
      default_payment_terms: 14,
      payment_terms_days: 14,
      iban: "DE00123456780000000000",
      bic: "TESTDEFFXXX",
      bank_name: "Test Bank",
      email: "billing@example.com",
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
      footer_text: "Danke für Ihr Vertrauen.",
      default_sender_identity_id: senderIdentityId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }
}

export async function createClientRecord({
  userId,
  companyName,
  email,
  address,
  contactPerson = "Max Mustermann",
}: {
  userId: string;
  companyName: string;
  email: string;
  address: string;
  contactPerson?: string;
}) {
  const id = crypto.randomUUID();
  const { error } = await admin.from("clients").insert({
    id,
    user_id: userId,
    company_name: companyName,
    contact_person: contactPerson,
    email,
    address,
    notes: "",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }

  return { id, companyName, email, address };
}
