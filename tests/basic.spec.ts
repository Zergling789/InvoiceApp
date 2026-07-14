import { test, expect } from "playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("FreelanceFlow")).toBeVisible();
});

for (const [route, heading] of [["/imprint", "Impressum"], ["/privacy", "Datenschutzerklärung"], ["/terms", "Nutzungsbedingungen"], ["/dpa", "Vereinbarung zur Auftragsverarbeitung"], ["/subprocessors", "Unterauftragnehmer"], ["/ai-notice", "Hinweise zu KI-Funktionen"], ["/contact", "Kontakt"]] as const) {
  test(`${route} is publicly reachable`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Rechtliche Informationen" })).toBeVisible();
  });
}
