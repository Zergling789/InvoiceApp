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
  let accessToken: string;

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
    const { data } = await userClient.auth.getSession();
    accessToken = data.session?.access_token ?? "";
    if (!accessToken) {
      throw new Error("Missing user access token.");
    }
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

  test("draft -> finalize -> issued + locked", async ({ request }) => {
    const invoiceId = await createDraftInvoice();

    const finalizeRes = await request.post(`/api/invoices/${invoiceId}/finalize`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(finalizeRes.ok()).toBe(true);

    const { data: invoice, error } = await admin
      .from("invoices")
      .select("status, is_locked, finalized_at")
      .eq("id", invoiceId)
      .single();

    expect(error).toBeNull();
    expect(invoice?.status).toBe("ISSUED");
    expect(invoice?.is_locked).toBe(true);
    expect(invoice?.finalized_at).toBeTruthy();
  });

  test("issued -> mark sent -> sent_at set", async ({ request }) => {
    const invoiceId = await createDraftInvoice();

    const finalizeRes = await request.post(`/api/invoices/${invoiceId}/finalize`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(finalizeRes.ok()).toBe(true);

    const sentRes = await request.post(`/api/invoices/${invoiceId}/mark-sent`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(sentRes.ok()).toBe(true);

    const { data: updated, error } = await admin
      .from("invoices")
      .select("status, sent_at")
      .eq("id", invoiceId)
      .single();

    expect(error).toBeNull();
    expect(updated?.status).toBe("SENT");
    expect(updated?.sent_at).toBeTruthy();
  });

  test("sent -> paid -> paid_at set", async ({ request }) => {
    const invoiceId = await createDraftInvoice();

    const finalizeRes = await request.post(`/api/invoices/${invoiceId}/finalize`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(finalizeRes.ok()).toBe(true);

    const sentRes = await request.post(`/api/invoices/${invoiceId}/mark-sent`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(sentRes.ok()).toBe(true);

    const paidRes = await request.post(`/api/invoices/${invoiceId}/mark-paid`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(paidRes.ok()).toBe(true);

    const { data: updated, error } = await admin
      .from("invoices")
      .select("status, paid_at")
      .eq("id", invoiceId)
      .single();

    expect(error).toBeNull();
    expect(updated?.status).toBe("PAID");
    expect(updated?.paid_at).toBeTruthy();
  });

  test("paid -> cancel is rejected", async ({ request }) => {
    const invoiceId = await createDraftInvoice();

    const finalizeRes = await request.post(`/api/invoices/${invoiceId}/finalize`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(finalizeRes.ok()).toBe(true);

    const paidRes = await request.post(`/api/invoices/${invoiceId}/mark-paid`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(paidRes.ok()).toBe(true);

    const cancelRes = await request.post(`/api/invoices/${invoiceId}/cancel`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(cancelRes.status()).toBe(409);
  });
});
