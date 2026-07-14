import { expect, test, type Page } from "playwright/test";

type RecipientResponse = "ACCEPTED" | "REJECTED" | null;

const recipientDocument = {
  type: "offer" as const,
  doc: {
    number: "ANG-E2E-001",
    date: "2026-07-14",
    validUntil: "2026-07-31",
    introText: "Vielen Dank für Ihre Anfrage.",
    footerText: "Wir freuen uns auf Ihre Rückmeldung.",
    positions: [{ id: "position-1", description: "Beratung", quantity: 2, price: 100, unit: "Std" }],
    vatRate: 19,
  },
  client: { companyName: "Empfänger GmbH" },
  settings: { companyName: "Muster Consulting", currency: "EUR" },
  expiresAt: "2026-08-14T00:00:00.000Z",
};

const mockRecipientApi = async (page: Page) => {
  let response: RecipientResponse = null;
  let responseReason: string | null = null;
  const submissions: Array<{ response: RecipientResponse; rejectionReason?: string }> = [];

  await page.route("**/api/public/documents/test-recipient-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...recipientDocument, response, responseReason }),
    });
  });

  await page.route("**/api/public/offers/test-recipient-token/respond", async (route) => {
    const body = route.request().postDataJSON() as { response: RecipientResponse; rejectionReason?: string };
    submissions.push(body);
    response = body.response;
    responseReason = body.response === "REJECTED" ? body.rejectionReason?.trim() || null : null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response }),
    });
  });

  return { submissions };
};

test.describe("öffentliches Empfängerportal", () => {
  test("Annahme führt auf die dauerhafte Dankeseite", async ({ page }) => {
    const api = await mockRecipientApi(page);

    await page.goto("/recipient/test-recipient-token");
    await expect(page.getByRole("heading", { name: "Ihr Angebot von Muster Consulting" })).toBeVisible();
    await page.getByRole("button", { name: "Angebot annehmen" }).click();

    await expect(page.getByRole("heading", { name: "Vielen Dank für Ihre Rückmeldung!" })).toBeVisible();
    await expect(page.getByText(/ANG-E2E-001/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Angebot annehmen" })).toHaveCount(0);
    expect(api.submissions).toEqual([{ response: "ACCEPTED" }]);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Vielen Dank für Ihre Rückmeldung!" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Angebot ablehnen" })).toHaveCount(0);
  });

  test("Ablehnungsbegründung erscheint erst nach Auswahl und wird übertragen", async ({ page }) => {
    const api = await mockRecipientApi(page);

    await page.goto("/recipient/test-recipient-token");
    await expect(page.getByLabel("Optionale Begründung bei Ablehnung")).toHaveCount(0);

    await page.getByRole("button", { name: "Angebot ablehnen" }).click();
    const reason = page.getByLabel("Optionale Begründung bei Ablehnung");
    await expect(reason).toBeVisible();
    await reason.fill("Der geplante Zeitraum passt leider nicht.");
    await page.getByRole("button", { name: "Ablehnung bestätigen" }).click();

    await expect(page.getByText("Antwort gespeichert: Abgelehnt")).toBeVisible();
    await expect(page.getByText(/Der geplante Zeitraum passt leider nicht\./)).toBeVisible();
    expect(api.submissions).toEqual([
      { response: "REJECTED", rejectionReason: "Der geplante Zeitraum passt leider nicht." },
    ]);
  });
});
