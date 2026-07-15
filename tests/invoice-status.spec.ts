import { test, expect } from "playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  admin,
  createClientRecord,
  createSenderIdentity,
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
  seedUserSettings,
} from "./helpers/supabaseAdmin";

const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const hasInvoiceStatusEnv = hasE2eSupabaseEnv && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const userClient = createClient(
  SUPABASE_URL ?? "https://example.supabase.co",
  SUPABASE_ANON_KEY ?? "missing-e2e-anon-key",
  {
  auth: { autoRefreshToken: false, persistSession: false },
  }
);

test.describe.serial("invoice status transitions", () => {
  test.skip(!hasInvoiceStatusEnv, "Supabase E2E credentials are not configured.");
  let user: { id: string; email: string; password: string };
  let client: { id: string; companyName: string; email: string; address: string };
  let accessToken: string;

  test.beforeAll(async () => {
    user = await createTestUser();
    const senderIdentityId = await createSenderIdentity(user.id);
    await seedUserSettings({ userId: user.id, senderIdentityId });
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
        service_date: new Date().toISOString().slice(0, 10),
        seller_country: "DE",
        customer_country: "DE",
        customer_type: "BUSINESS",
        service_country: "DE",
        currency: "EUR",
        positions: [{
          id: crypto.randomUUID(),
          description: "Beratung",
          quantity: 1,
          unit: "Std",
          price: 100,
          taxCategory: "STANDARD",
          taxRate: 19,
        }],
        intro_text: "",
        footer_text: "",
        vat_rate: 19,
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
    expect(finalizeRes.ok(), await finalizeRes.text()).toBe(true);

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

  test("mobile detail requires acknowledgement and finalizes visibly", async ({ page }) => {
    const invoiceId = await createDraftInvoice();
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(user.email);
    await page.getByLabel("Passwort").fill(user.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto(`/app/invoices/${invoiceId}`);
    const legalConsent = page.getByRole("checkbox");
    const invoiceHeading = page.getByRole("heading", { name: "Entwurf", exact: true });
    await expect(legalConsent.or(invoiceHeading).first()).toBeVisible();
    if (await legalConsent.isVisible()) {
      await legalConsent.check();
      await page.getByRole("button", { name: /Zustimmen und fortfahren/ }).click();
    }

    await expect(invoiceHeading).toBeVisible();
    await page.getByRole("button", { name: "Finalisieren", exact: true }).click();
    await expect(page.getByText(/ausschließlich einfache inländische B2B-Rechnungen/)).toBeVisible();

    const confirmButton = page.getByRole("button", { name: "Bestaetigen" });
    await expect(confirmButton).toBeDisabled();
    await page.getByRole("checkbox", { name: /Hinweis gelesen/ }).check();
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    await expect.poll(async () => {
      const { data, error } = await admin
        .from("invoices")
        .select("status, is_locked")
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    }).toEqual({ status: "ISSUED", is_locked: true });

    await expect(page.getByText("Offen", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalisieren", exact: true })).toHaveCount(0);
  });

  test("issued -> mark sent -> sent_at set", async ({ request }) => {
    const invoiceId = await createDraftInvoice();

    const finalizeRes = await request.post(`/api/invoices/${invoiceId}/finalize`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(finalizeRes.ok(), await finalizeRes.text()).toBe(true);

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

    expect(cancelRes.status()).toBe(400);
    const cancelBody = await cancelRes.json();
    expect(cancelBody).toMatchObject({
      error: { code: "STATUS_TRANSITION_NOT_ALLOWED" },
    });
  });
});
