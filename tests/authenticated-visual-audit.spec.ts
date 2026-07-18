import crypto from "node:crypto";
import { expect, test, type Page, type TestInfo } from "playwright/test";

import {
  admin,
  createClientRecord,
  createSenderIdentity,
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
  seedUserSettings,
  type TestUser,
} from "./helpers/supabaseAdmin";

type Theme = "light" | "dark";
type Viewport = { name: "desktop" | "mobile"; width: number; height: number };

const viewports: Viewport[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const themes: Theme[] = ["light", "dark"];

async function login(page: Page, user: TestUser, theme: Theme) {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem("theme", selectedTheme);
  }, theme);
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(user.email);
  await page.getByLabel("Passwort").fill(user.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/app/);

  const legalConsent = page.getByLabel(/Ich akzeptiere die Nutzungsbedingungen/);
  const dashboardHeading = page.getByRole("heading", { name: /^Hallo /, level: 1 });
  await expect(legalConsent.or(dashboardHeading).first()).toBeVisible();
  if (await legalConsent.isVisible()) {
    await legalConsent.check();
    await page.getByRole("button", { name: /Zustimmen und fortfahren/ }).click();
  }
  await expect(dashboardHeading).toBeVisible();
}

async function auditRoute({
  page,
  testInfo,
  path,
  screenshotName,
  expectedHeading,
  pageErrors,
}: {
  page: Page;
  testInfo: TestInfo;
  path: string;
  screenshotName: string;
  expectedHeading: string | RegExp;
  pageErrors: string[];
}) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: expectedHeading }).first()).toBeVisible();
  await expect(page.getByText("Unerwarteter Fehler", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Die Anwendung konnte nicht angezeigt werden.", { exact: true })).toHaveCount(0);

  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyText: document.body.innerText,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  expect(layout.overflow, `${path} darf nicht horizontal überlaufen`).toBeLessThanOrEqual(1);
  expect(layout.bodyText, `${path} enthält beschädigte UTF-8-Zeichen`).not.toMatch(/(?:Ã.|â€|�)/);
  expect(pageErrors, `${path} hat einen unbehandelten Browserfehler`).toEqual([]);

  await testInfo.attach(screenshotName, {
    body: await page.screenshot({ animations: "disabled", fullPage: false }),
    contentType: "image/png",
  });

  return layout.colorScheme;
}

test.describe.serial("authentifizierter visueller Qualitätscheck", () => {
  test.skip(!hasE2eSupabaseEnv, "Dedicated Supabase E2E credentials are not configured.");
  test.use({ reducedMotion: "reduce" });

  let user: TestUser;
  let clientId: string;
  let offerId: string;
  let invoiceId: string;

  test.beforeAll(async () => {
    user = await createTestUser();
    const senderIdentityId = await createSenderIdentity(user.id);
    await seedUserSettings({ userId: user.id, senderIdentityId });
    clientId = (await createClientRecord({
      userId: user.id,
      companyName: "Musterbau GmbH",
      contactPerson: "Mara Muster",
      email: "mara.muster@example.com",
      address: "Werkstraße 12\n10115 Berlin",
    })).id;

    const today = new Date().toISOString().slice(0, 10);
    const position = {
      id: crypto.randomUUID(),
      description: "Montage vor Ort",
      quantity: 2,
      unit: "Std",
      price: 75,
      taxCategory: "STANDARD",
      taxRate: 19,
    };
    const { data: offer, error: offerError } = await admin.from("offers").insert({
      user_id: user.id,
      client_id: clientId,
      number: "ANG-VISUAL-0001",
      date: today,
      valid_until: today,
      positions: [position],
      vat_rate: 19,
      currency: "EUR",
      status: "ACCEPTED",
      updated_at: new Date().toISOString(),
    }).select("id").single();
    if (offerError || !offer?.id) throw offerError ?? new Error("Visual offer seed failed.");
    offerId = offer.id;

    const { data: invoice, error: invoiceError } = await admin.from("invoices").insert({
      user_id: user.id,
      client_id: clientId,
      date: today,
      due_date: today,
      service_date: today,
      seller_country: "DE",
      customer_country: "DE",
      customer_type: "BUSINESS",
      service_country: "DE",
      currency: "EUR",
      positions: [position],
      intro_text: "Vielen Dank für Ihren Auftrag.",
      footer_text: "Zahlbar ohne Abzug.",
      vat_rate: 19,
      status: "DRAFT",
      is_locked: false,
      updated_at: new Date().toISOString(),
    }).select("id").single();
    if (invoiceError || !invoice?.id) throw invoiceError ?? new Error("Visual invoice seed failed.");
    invoiceId = invoice.id;

    const { error: projectError } = await admin.from("projects").insert({
      user_id: user.id,
      client_id: clientId,
      name: "Terrasse Musterstraße",
      status: "active",
      budget_type: "fixed",
      budget_total: 3_500,
      hourly_rate: null,
      updated_at: new Date().toISOString(),
    });
    if (projectError) throw projectError;
  });

  test.afterAll(async () => {
    if (user?.id) await deleteTestUser(user.id);
  });

  for (const viewport of viewports) {
    for (const theme of themes) {
      test(`${viewport.name} · ${theme} · geschützte Kernseiten`, async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await login(page, user, theme);

        const routes = [
          { path: "/app", name: "dashboard", heading: /^Hallo / },
          { path: "/app/todos", name: "todos", heading: "To-dos" },
          { path: "/app/documents", name: "documents", heading: "Dokumente" },
          { path: "/app/clients", name: "clients", heading: "Kunden" },
          { path: "/app/projects", name: "projects", heading: "Projekte" },
          { path: "/app/positions", name: "positions", heading: "Produkte & Leistungen" },
          { path: "/app/settings", name: "settings", heading: "Einstellungen" },
          { path: "/app/more", name: "more", heading: "Mehr" },
          { path: `/app/offers/${offerId}`, name: "offer-detail", heading: "ANG-VISUAL-0001" },
          { path: `/app/invoices/${invoiceId}`, name: "invoice-detail", heading: "Entwurf" },
        ];

        for (const route of routes) {
          const colorScheme = await auditRoute({
            page,
            testInfo,
            path: route.path,
            screenshotName: `${viewport.name}-${theme}-${route.name}.png`,
            expectedHeading: route.heading,
            pageErrors,
          });
          expect(colorScheme).toBe(theme);
        }

        if (viewport.name === "mobile") {
          await page.getByRole("button", { name: "Menü öffnen" }).click();
          await expect(page.getByRole("navigation", { name: "Mobile Navigation" })).toBeVisible();
          await expect(page.getByRole("link", { name: "Dokumente" })).toBeVisible();
          await expect(page.getByRole("button", { name: "Feedback", exact: true })).toBeVisible();
          await page.getByRole("button", { name: "Menü schließen" }).click();
          await expect(page.getByRole("navigation", { name: "Mobile Navigation" })).toBeHidden();
        }
      });
    }
  }
});
