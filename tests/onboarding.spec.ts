import { expect, test } from "playwright/test";

import {
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
} from "./helpers/supabaseAdmin";

test.describe.serial("new user onboarding", () => {
  test.skip(!hasE2eSupabaseEnv, "Supabase E2E credentials are not configured.");

  let user: { id: string; email: string; password: string };

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user?.id) await deleteTestUser(user.id);
  });

  test("company, tax, customer and first offer", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(user.email);
    await page.getByLabel("Passwort").fill(user.password);
    await page.getByRole("button", { name: "Anmelden" }).click();

    const legalConsent = page.getByLabel(/Ich akzeptiere die Nutzungsbedingungen/);
    const startButton = page.getByRole("button", { name: "Einrichtung starten" });
    await expect(legalConsent.or(startButton).first()).toBeVisible();
    if (await legalConsent.isVisible()) {
      await legalConsent.click();
      await expect(legalConsent).toBeChecked();
      const acceptButton = page.getByRole("button", {
        name: /Zustimmen und fortfahren/,
      });
      await expect(acceptButton).toBeEnabled();
      await acceptButton.click();
    }

    await expect(page).toHaveURL(/\/app\/onboarding/);
    await startButton.click();

    await page.getByLabel("Firmenname *").fill("E2E Handwerk");
    await page
      .getByLabel("Inhaber oder Ansprechpartner *")
      .fill("Max Muster");
    await page.getByLabel("E-Mail *").fill(user.email);
    await page.getByLabel("Straße *").fill("Teststraße");
    await page.getByLabel("Hausnummer *").fill("12");
    await page.getByLabel("PLZ *").fill("10115");
    await page.getByLabel("Ort *").fill("Berlin");
    await page
      .getByRole("button", { name: "Firmendaten speichern" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Steuerliche Grundlage" }),
    ).toBeVisible();
    await page.getByLabel("Steuernummer").fill("12/345/67890");
    await page
      .getByRole("button", { name: "Steuerangaben speichern" })
      .click();

    await page.getByRole("button", { name: "Neuen Kunden anlegen" }).click();
    const customerDialog = page.getByRole("dialog", { name: "Neuer Kunde" });
    await expect(customerDialog).toBeVisible();
    await customerDialog.getByLabel("Vorname *").fill("Erika");
    await customerDialog.getByLabel("Nachname *").fill("Empfänger");
    await customerDialog.getByLabel("Firma", { exact: true }).fill("E2E Kunde");
    await customerDialog.getByLabel("E-Mail", { exact: true }).fill("kunde@example.com");
    await customerDialog.locator("summary").filter({ hasText: /^Adresse/ }).click();
    const streetField = customerDialog.getByLabel("Straße", { exact: true });
    await expect(streetField).toBeVisible();
    await streetField.fill("Kundenweg");
    await customerDialog.getByLabel("Hausnummer", { exact: true }).fill("5");
    await customerDialog.getByLabel("PLZ", { exact: true }).fill("10115");
    await customerDialog.getByLabel("Ort", { exact: true }).fill("Berlin");
    await customerDialog.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(customerDialog).toBeHidden();

    await expect(
      page.getByRole("heading", { name: "Erstes Angebot erstellen" }),
    ).toBeVisible();
    await expect(page.getByText(/E2E Kunde ist bereits ausgewählt/)).toBeVisible();
    await page.getByRole("button", { name: "Angebot erstellen" }).click();

    await expect(page.getByRole("heading", { name: "Neues Angebot" })).toBeVisible();
    await expect(page.getByLabel("Kunde auswählen")).not.toHaveValue("");
    await page.getByRole("button", { name: "Weiter zu Dokumentdaten" }).click();
    await page.getByRole("button", { name: "Weiter zu Positionen" }).click();
    await page.getByRole("button", { name: "Position hinzufügen" }).click();
    await page.getByLabel("Beschreibung 1").fill("Montage");
    await page.getByLabel("Menge 1").fill("1");
    await page.getByLabel("Einheit 1").fill("Std");
    await page.getByLabel("Preis 1").fill("80");
    await page
      .getByRole("button", { name: "Weiter zu Texte und Optionen" })
      .click();
    await page.getByRole("button", { name: "Weiter zur Vorschau" }).click();
    await page
      .getByRole("button", { name: "Angebot erstellen", exact: true })
      .click();

    await expect(page.getByText("Du bist startklar")).toBeVisible();
    await page.getByRole("button", { name: "Zu meinen Dokumenten" }).click();
    await expect(page.getByRole("heading", { name: "Dokumente" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "E2E Kunde" })).toBeVisible();
  });
});
