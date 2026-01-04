import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { admin, createClientRecord, createTestUser, deleteTestUser } from "./helpers/supabaseAdmin";

const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

test.describe.serial("invoice status transitions", () => {
  let user: { id: string; email: string; password: string };
  let client: { id: string; companyName: string; email: string; address: string };

  test.beforeAll(async () => {
    user = await createTestUser();
    client = await createClientRecord({
      userId: user.id,
      companyName: "Status Kunde GmbH",
      email: "status@example.com",
      address: "Testweg 1\n12345 Berlin",
    });

    const { error } = await userClient.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (error) throw error;
  });

  test.afterAll(async () => {
    if (user?.id) {
      await deleteTestUser(user.id);
    }
  });

  const createDraftInvoice = async () => {
    const { data, error } = await admin
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: client.id,
        date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        positions: [],
        intro_text: "",
        footer_text: "",
        vat_rate: 0,
        status: "DRAFT",
        is_locked: false,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      throw error ?? new Error("Failed to create invoice");
    }

    return data.id as string;
  };

  test("draft -> finalize -> issued + locked", async () => {
    const invoiceId = await createDraftInvoice();

    const { error: finalizeError } = await userClient.rpc("finalize_invoice", {
      invoice_id: invoiceId,
    });

    expect(finalizeError).toBeNull();

    const { data: invoice, error } = await admin
      .from("invoices")
      .select("status, is_locked")
      .eq("id", invoiceId)
      .single();

    expect(error).toBeNull();
    expect(invoice?.status).toBe("ISSUED");
    expect(invoice?.is_locked).toBe(true);
  });

  test("issued -> mark paid -> paid + paid_at set", async () => {
    const invoiceId = await createDraftInvoice();

    const { error: finalizeError } = await userClient.rpc("finalize_invoice", {
      invoice_id: invoiceId,
    });
    expect(finalizeError).toBeNull();

    const { data: updated, error } = await userClient
      .from("invoices")
      .update({ status: "PAID" })
      .eq("id", invoiceId)
      .select("status, paid_at, payment_date")
      .single();

    expect(error).toBeNull();
    expect(updated?.status).toBe("PAID");
    expect(updated?.paid_at).toBeTruthy();
    expect(updated?.payment_date).toBeTruthy();
  });

  test("paid -> cancel is rejected", async () => {
    const invoiceId = await createDraftInvoice();

    const { error: finalizeError } = await userClient.rpc("finalize_invoice", {
      invoice_id: invoiceId,
    });
    expect(finalizeError).toBeNull();

    const { error: paidError } = await userClient
      .from("invoices")
      .update({ status: "PAID" })
      .eq("id", invoiceId);
    expect(paidError).toBeNull();

    const { error: cancelError } = await userClient
      .from("invoices")
      .update({ status: "CANCELED" })
      .eq("id", invoiceId);

    expect(cancelError).toBeTruthy();
  });
});
