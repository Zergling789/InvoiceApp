import { test, expect } from "playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".landing__brand")).toBeVisible();
});
