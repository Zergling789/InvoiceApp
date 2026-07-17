import { expect, test, type Page } from "playwright/test";

import {
  admin,
  createSenderIdentity,
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
  seedUserSettings,
} from "./helpers/supabaseAdmin";

async function acceptLegalTermsIfRequired(page: Page) {
  const legalConsent = page.getByLabel(/Ich akzeptiere die Nutzungsbedingungen/);
  if (await legalConsent.isVisible()) {
    await legalConsent.check();
    await page.getByRole("button", { name: /Zustimmen und fortfahren/ }).click();
  }
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe.serial("mobiler Rechnungsworkflow", () => {
  test.skip(!hasE2eSupabaseEnv, "Dedicated Supabase E2E credentials are not configured.");
  test.use({ viewport: { width: 390, height: 844 } });

  let user: { id: string; email: string; password: string };

  test.beforeAll(async () => {
    user = await createTestUser();
    const senderIdentityId = await createSenderIdentity(user.id);
    await seedUserSettings({ userId: user.id, senderIdentityId });
  });

  test.afterAll(async () => {
    if (user?.id) await deleteTestUser(user.id);
  });

  test("Kunde anlegen, Rechnung speichern, neu laden und finalisieren", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(user.email);
    await page.getByLabel("Passwort").fill(user.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/app/);
    await acceptLegalTermsIfRequired(page);

    await page.goto("/app/clients");
    await expect(page.getByRole("heading", { name: "Kunden" })).toBeVisible();
    await page.getByRole("button", { name: /Neuer Kunde|Ersten Kunden anlegen/ }).click();
    await expect(page.getByRole("dialog", { name: "Neuer Kunde" })).toBeVisible();
    await expectNoPageOverflow(page);

    await page.getByLabel("Vorname *").fill("Mara");
    await page.getByLabel("Nachname *").fill("Mobil");
    await page.getByLabel("Firma").fill("Mobilbau GmbH");
    await page.getByLabel("E-Mail").fill("mobilbau@example.com");
    await page.getByLabel("Straße").fill("Kundenweg");
    await page.getByLabel("Hausnummer").fill("7");
    await page.getByLabel("PLZ").fill("10115");
    await page.getByLabel("Ort").fill("Berlin");
    await page.getByRole("button", { name: "Änderungen speichern" }).click();

    await expect(page.getByText("Mobilbau GmbH", { exact: true })).toBeVisible();
    await page.goto("/app/documents");
    await page.getByRole("button", { name: "Neues Dokument erstellen" }).click();
    const quickCreate = page.getByRole("dialog", { name: "Dokument oder Kunde erstellen" });
    await expect(quickCreate).toBeVisible();
    await quickCreate.getByRole("button", { name: "Neue Rechnung" }).click();

    const editor = page.getByRole("dialog", { name: "Neue Rechnung" });
    await expect(editor).toBeVisible();
    await expectNoPageOverflow(page);
    await page.getByLabel("Kunde auswählen").selectOption({ label: "Mobilbau GmbH" });
    await page.getByRole("button", { name: "Weiter zu Dokumentdaten" }).click();
    await page.getByRole("button", { name: "Weiter zu Positionen" }).click();
    await page.getByRole("button", { name: "Position hinzufügen" }).click();
    await page.getByLabel("Beschreibung 1").fill("Montage vor Ort");
    await page.getByLabel("Menge 1").fill("2");
    await page.getByLabel("Einheit 1").fill("Std");
    await page.getByLabel("Preis 1").fill("75");
    await page.getByRole("button", { name: "Weiter zu Texte und Optionen" }).click();
    await page.getByRole("button", { name: "Weiter zur Vorschau" }).click();
    await page.getByRole("button", { name: "Rechnung erstellen", exact: true }).click();

    await expect(page).toHaveURL(/\/app\/documents/);
    const { data: invoice, error } = await admin
      .from("invoices")
      .select("id, status, is_locked")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !invoice?.id) throw error ?? new Error("Created invoice is missing.");
    expect(invoice).toMatchObject({ status: "DRAFT", is_locked: false });

    const invoiceCard = page.locator(`[data-document-key="invoice-${invoice.id}"]`);
    await expect(invoiceCard).toBeVisible();
    await page.reload();
    await expect(page.locator(`[data-document-key="invoice-${invoice.id}"]`)).toBeVisible();
    await page.locator(`[data-document-key="invoice-${invoice.id}"]`).click();

    await expect(page.getByRole("heading", { name: "Entwurf", exact: true })).toBeVisible();
    await expectNoPageOverflow(page);
    await page.getByRole("button", { name: "Finalisieren", exact: true }).click();
    const acknowledgement = page.getByRole("checkbox", { name: /Hinweis gelesen/ });
    await expect(acknowledgement).toBeVisible();
    await acknowledgement.check();
    await page.getByRole("button", { name: /Bestätigen|Bestaetigen/ }).click();

    await expect.poll(async () => {
      const { data, error: statusError } = await admin
        .from("invoices")
        .select("status, is_locked")
        .eq("id", invoice.id)
        .single();
      if (statusError) throw statusError;
      return data;
    }).toEqual({ status: "ISSUED", is_locked: true });

    await expect(page.getByText("Offen", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Finalisieren", exact: true })).toHaveCount(0);
  });
});
