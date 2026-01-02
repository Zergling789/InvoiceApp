import { test, expect } from "@playwright/test";
import {
  admin,
  createClientRecord,
  createSenderIdentity,
  createTestUser,
  deleteTestUser,
  seedUserSettings,
} from "./helpers/supabaseAdmin";

test.describe.serial("value stream: offer -> invoice", () => {
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
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Passwort").fill(user.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.getByRole("link", { name: "Angebote" }).click();
    await page.getByRole("button", { name: "Erstellen" }).click();

    await expect(page.getByRole("heading", { name: "Angebot erstellen" })).toBeVisible();
    await page.locator("#document-client").selectOption({ label: client.companyName });
    await page.getByRole("button", { name: "Position hinzufügen" }).click();
    await page.getByPlaceholder("Beschreibung").fill("Beratung");
    await page.getByPlaceholder("Menge").fill("1");
    await page.getByPlaceholder("Einheit").fill("Stk");
    await page.getByPlaceholder("Preis").fill("100");

    const offerNumber = await page.locator("#document-number").inputValue();
    await page.getByRole("button", { name: "Weiter" }).click();

    const offerRow = page.locator("tr", { hasText: offerNumber });
    await expect(offerRow).toBeVisible();
    await offerRow.getByRole("button", { name: "Angebot ansehen" }).click();
    await expect(page.getByText("ANGEBOT")).toBeVisible();
    await page.getByRole("button", { name: "E-Mail" }).click();
    await expect(page.getByRole("heading", { name: "Dokument senden" })).toBeVisible();
    await page.locator("label:has-text('Empfänger')").locator("xpath=following-sibling::input").fill(client.email);
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByText("E-Mail wurde erfolgreich versendet.")).toBeVisible();
    await page.getByRole("button", { name: "Schließen" }).first().click();

    await expect(offerRow.getByText("Sent", { exact: true })).toBeVisible();

    await offerRow.getByRole("button", { name: "In Rechnung wandeln" }).click();
    await page.getByRole("button", { name: "Bestaetigen" }).click();
    await expect(page.getByText("Rechnung erstellt!")).toBeVisible();

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

    await page.getByRole("link", { name: "Rechnungen" }).click();
    const invoiceRow = page.locator("tr", { hasText: invoiceData.number });
    await expect(invoiceRow.getByText("Draft", { exact: true })).toBeVisible();
    await invoiceRow.getByRole("button", { name: "Rechnung ansehen" }).click();
    await expect(page.getByText("RECHNUNG")).toBeVisible();
    await page.getByRole("button", { name: "Schließen" }).first().click();

    await page.getByRole("button", { name: "Erstellen" }).click();
    await page.locator("#document-client").selectOption({ label: client.companyName });
    await page.getByRole("button", { name: "Position hinzufügen" }).click();
    await page.getByPlaceholder("Beschreibung").fill("Design");
    await page.getByPlaceholder("Menge").fill("2");
    await page.getByPlaceholder("Einheit").fill("Std");
    await page.getByPlaceholder("Preis").fill("150");

    const invoiceNumber = await page.locator("#document-number").inputValue();
    const saveButton = page.getByRole("button", { name: "Speichern" });
    await saveButton.click();
    await expect(saveButton).toBeEnabled();
    await page.getByRole("button", { name: "Finalisieren" }).click();
    await page.getByRole("button", { name: "Bestaetigen" }).click();

    await expect(page.getByText("Issued", { exact: true })).toBeVisible();
    await expect(page.getByText("Locked", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Per E-Mail senden" }).click();
    await page.locator("label:has-text('Empfänger')").locator("xpath=following-sibling::input").fill(client.email);
    await page.getByRole("button", { name: "Senden" }).click();
    await expect(page.getByText("E-Mail wurde erfolgreich versendet.")).toBeVisible();
    await expect(page.getByText("Sent", { exact: true })).toBeVisible();

    const { data: sentInvoice } = await admin
      .from("invoices")
      .select("sent_count")
      .eq("number", invoiceNumber)
      .eq("user_id", user.id)
      .single();
    expect(sentInvoice.sent_count).toBeGreaterThan(0);
  });
});
