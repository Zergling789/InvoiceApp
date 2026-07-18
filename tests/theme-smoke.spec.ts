import { expect, test } from "playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`legal pages remain readable without horizontal scrolling in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem("theme", selectedTheme);
    }, theme);

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Datenschutzerklärung" })).toBeVisible();

    const appearance = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        colorScheme: styles.colorScheme,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(appearance.colorScheme).toBe(theme);
    expect(appearance.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(appearance.color).not.toBe(appearance.backgroundColor);
    expect(appearance.hasHorizontalScroll).toBe(false);
  });
}
