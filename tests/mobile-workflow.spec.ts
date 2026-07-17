import { expect, test } from "playwright/test";

test.describe("mobiler Dokumentworkflow", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Angebotsdetails bleiben ohne horizontales Seiten-Scrollen bedienbar", async ({ page }) => {
    await page.goto("/demo/angebotdetails");

    await expect(page.getByRole("heading", { name: "AN-0005" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Empfänger-Link kopieren" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Erneut senden" })).toBeVisible();
    await expect(page.getByText("Den persönlichen Link erneut teilen oder die Rückmeldung abwarten.")).toBeVisible();

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    await page.getByText("Aktivitäten").scrollIntoViewIfNeeded();
    await expect(page.getByText("Aktivitäten")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Rechtliche Informationen" })).toBeVisible();
  });
});
