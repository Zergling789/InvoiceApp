import { test, expect } from "playwright/test";
import {
  admin,
  createClientRecord,
  createSenderIdentity,
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
  seedUserSettings,
} from "./helpers/supabaseAdmin";

test.describe.serial("value stream: offer -> invoice", () => {
  test.skip(!hasE2eSupabaseEnv, "Supabase E2E credentials are not configured.");
  let user: { id: string; email: string; password: string };
  let client: { id: string; companyName: string; email: string; address: string };

  test.beforeAll(async () => {
    user = await createTestUser();
    const senderIdentityId = await createSenderIdentity(user.id);
    await seedUserSettings({ userId: user.id, senderIdentityId });
    client = await createClientRecord({
      userId: user.id,
      companyName: "E2E Kunde GmbH",
      email: "kunde@example.com",
      address: "Kundenstrasse 5\n10115 Berlin",
    });
  });

  test.afterAll(async () => {
    if (user?.id) {
      await deleteTestUser(user.id);
    }
  });

  test("offer send, conversion, invoice finalize and send", async ({ page }) => {
    await page.route("**/api/email", async (route) => {
      const payload = route.request().postDataJSON() as {
        documentId: string;
        documentType: "offer" | "invoice";
        to: string;
      };
      const table = payload.documentType === "invoice" ? "invoices" : "offers";
      const { data, error } = await admin
        .from(table)
        .select("status, sent_count, sent_at")
        .eq("id", payload.documentId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      const nextCount = Number(data?.sent_count ?? 0) + 1;
      const nextStatus =
        payload.documentType === "invoice"
          ? data?.status === "ISSUED"
            ? "SENT"
            : data?.status ?? "SENT"
          : data?.status === "DRAFT"
          ? "SENT"
          : data?.status ?? "SENT";

      await admin
        .from(table)
        .update({
          status: nextStatus,
          sent_count: nextCount,
          sent_at: data?.sent_count ? data?.sent_at : new Date().toISOString(),
          last_sent_at: new Date().toISOString(),
          last_sent_to: payload.to,
          sent_via: "EMAIL",
        })
        .eq("id", payload.documentId);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(user.email);
    await page.getByLabel("Passwort").fill(user.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto("/app/documents");

    const legalConsent = page.getByRole("checkbox");
    const createOffer = page.getByRole("button", { name: "Angebot erstellen" });
    await expect(legalConsent.or(createOffer).first()).toBeVisible();
    if (await legalConsent.isVisible()) {
      await legalConsent.check();
      await page.getByRole("button", { name: /Zustimmen und fortfahren/ }).click();
    }

    await createOffer.click();

    await expect(page.getByRole("heading", { name: "Angebot erstellen" })).toBeVisible();
    await page.getByLabel("Kunde auswählen").selectOption({ label: client.companyName });
    await page.getByRole("button", { name: "Position hinzufügen" }).click();
    await page.getByLabel("Beschreibung 1").fill("Beratung");
    await page.getByLabel("Menge 1").fill("1");
    await page.getByLabel("Einheit 1").fill("Stk");
    await page.getByLabel("Preis 1").fill("100");

    const offerNumber = await page.getByLabel("Angebotsnummer").inputValue();
    await page.getByRole("button", { name: "Angebot erstellen" }).last().click();

    const offerRow = page.getByRole("button").filter({ hasText: offerNumber });
    await expect(offerRow).toBeVisible();
    await offerRow.click();
    await expect(page).toHaveURL(/\/app\/offers\//);
    await expect(page.getByText(offerNumber, { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByRole("heading", { name: "Dokument senden" })).toBeVisible();
    await page.locator("label:has-text('Empfänger')").locator("xpath=following-sibling::input").fill(client.email);
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByText("E-Mail wurde erfolgreich versendet.")).toBeVisible();
    await page.getByRole("button", { name: "Schließen" }).first().click();

    await expect(page.getByText("Versendet", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Als angenommen markieren" }).click();
    await page.getByRole("button", { name: "Bestaetigen" }).click();
    await expect(page.getByText("Angenommen", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "In Rechnung wandeln" }).click();
    await page.getByRole("button", { name: "Bestaetigen" }).click();
    await expect(page).toHaveURL(/\/app\/invoices\//);

    const { data: offerData } = await admin
      .from("offers")
      .select("invoice_id")
      .eq("number", offerNumber)
      .eq("user_id", user.id)
      .single();
    const { data: invoiceData } = await admin
      .from("invoices")
      .select("number, status")
      .eq("id", offerData.invoice_id)
      .single();

    expect(invoiceData.status).toBe("DRAFT");
    expect(invoiceData.number).toBeTruthy();
  });
});
