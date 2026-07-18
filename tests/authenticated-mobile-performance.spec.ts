import { expect, test, type Page, type TestInfo } from "playwright/test";

import {
  createClientRecord,
  createSenderIdentity,
  createTestUser,
  deleteTestUser,
  hasE2eSupabaseEnv,
  seedUserSettings,
  type TestUser,
} from "./helpers/supabaseAdmin";

const budgets = {
  routeReadyMs: 12_000,
  domContentLoadedMs: 8_000,
  largestContentfulPaintMs: 9_000,
  cumulativeLayoutShift: 0.1,
  longTaskDurationMs: 1_200,
  scriptBytes: 900 * 1024,
  resourceRequests: 40,
  firstStepInteractionMs: 1_500,
} as const;

type BrowserMetrics = {
  domContentLoadedMs: number;
  largestContentfulPaintMs: number;
  cumulativeLayoutShift: number;
  longTaskDurationMs: number;
  scriptBytes: number;
  resourceBytes: number;
  resourceRequests: number;
};

async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(user.email);
  await page.getByLabel("Passwort").fill(user.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/app/);

  const legalConsent = page.getByLabel(/Ich akzeptiere die Nutzungsbedingungen/);
  const dashboardHeading = page.getByRole("heading", { name: "Dashboard", exact: true });
  await expect(legalConsent.or(dashboardHeading).first()).toBeVisible();
  if (await legalConsent.isVisible()) {
    await legalConsent.check();
    await page.getByRole("button", { name: /Zustimmen und fortfahren/ }).click();
  }
  await expect(dashboardHeading).toBeVisible();
}

async function installPerformanceObservers(page: Page) {
  await page.addInitScript(() => {
    type PerformanceState = {
      largestContentfulPaintMs: number;
      cumulativeLayoutShift: number;
      longTaskDurationMs: number;
    };
    const performanceWindow = window as Window & { __freelanceFlowPerformance?: PerformanceState };
    performanceWindow.__freelanceFlowPerformance = {
      largestContentfulPaintMs: 0,
      cumulativeLayoutShift: 0,
      longTaskDurationMs: 0,
    };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries.at(-1);
        if (latest && performanceWindow.__freelanceFlowPerformance) {
          performanceWindow.__freelanceFlowPerformance.largestContentfulPaintMs = latest.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // Older browser engines may omit this optional metric; the other budgets remain active.
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!layoutShift.hadRecentInput && performanceWindow.__freelanceFlowPerformance) {
            performanceWindow.__freelanceFlowPerformance.cumulativeLayoutShift += layoutShift.value ?? 0;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // Optional metric; unsupported engines still run the remaining assertions.
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (performanceWindow.__freelanceFlowPerformance) {
            performanceWindow.__freelanceFlowPerformance.longTaskDurationMs += entry.duration;
          }
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {
      // Optional metric; unsupported engines still run the remaining assertions.
    }
  });
}

async function readBrowserMetrics(page: Page): Promise<BrowserMetrics> {
  return page.evaluate(() => {
    type PerformanceState = {
      largestContentfulPaintMs: number;
      cumulativeLayoutShift: number;
      longTaskDurationMs: number;
    };
    const performanceWindow = window as Window & { __freelanceFlowPerformance?: PerformanceState };
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const resourceBytes = resources.reduce(
      (sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0),
      0,
    );
    const scripts = resources.filter(
      (entry) => entry.initiatorType === "script" || new URL(entry.name).pathname.endsWith(".js"),
    );
    const scriptBytes = scripts.reduce(
      (sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0),
      0,
    );
    const observed = performanceWindow.__freelanceFlowPerformance;
    return {
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
      largestContentfulPaintMs: observed?.largestContentfulPaintMs ?? 0,
      cumulativeLayoutShift: observed?.cumulativeLayoutShift ?? 0,
      longTaskDurationMs: observed?.longTaskDurationMs ?? 0,
      scriptBytes,
      resourceBytes,
      resourceRequests: resources.length,
    };
  });
}

test.describe.serial("authentifizierte mobile Performance", () => {
  test.skip(!hasE2eSupabaseEnv, "Dedicated Supabase E2E credentials are not configured.");

  let user: TestUser;
  let clientName: string;

  test.beforeAll(async () => {
    user = await createTestUser();
    const senderIdentityId = await createSenderIdentity(user.id);
    await seedUserSettings({ userId: user.id, senderIdentityId });
    const client = await createClientRecord({
      userId: user.id,
      companyName: "Performance Kunde GmbH",
      contactPerson: "Mara Mobil",
      email: "performance@example.com",
      address: "Testweg 7\n10115 Berlin",
    });
    clientName = client.companyName;
  });

  test.afterAll(async () => {
    if (user?.id) await deleteTestUser(user.id);
  });

  test("Rechnungserstellung bleibt unter gedrosselter 4G-Verbindung schnell bedienbar", async ({ page }, testInfo: TestInfo) => {
    test.setTimeout(120_000);
    await login(page, user);
    await installPerformanceObservers(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (4 * 1024 * 1024) / 8,
      uploadThroughput: (1 * 1024 * 1024) / 8,
      connectionType: "cellular4g",
    });

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const routeStartedAt = Date.now();
    await page.goto("/app/invoices/new");
    const editor = page.getByRole("dialog", { name: "Neue Rechnung" });
    await expect(editor).toBeVisible();
    const customerSelect = editor.getByLabel("Kunde auswählen");
    await expect(customerSelect).toBeEnabled();
    const routeReadyMs = Date.now() - routeStartedAt;

    await page.waitForTimeout(500);
    const metrics = await readBrowserMetrics(page);
    const interactionStartedAt = Date.now();
    await customerSelect.selectOption({ label: clientName });
    await editor.getByRole("button", { name: "Weiter zu Dokumentdaten" }).click();
    await expect(editor.getByRole("button", { name: "Weiter zu Positionen" })).toBeVisible();
    const firstStepInteractionMs = Date.now() - interactionStartedAt;

    const report = {
      profile: {
        viewport: "390x844",
        latencyMs: 150,
        downloadMbps: 4,
        uploadMbps: 1,
        cache: "disabled",
      },
      measurements: { routeReadyMs, firstStepInteractionMs, ...metrics },
      budgets,
    };
    await testInfo.attach("mobile-performance-report.json", {
      body: Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
      contentType: "application/json",
    });

    expect(pageErrors).toEqual([]);
    expect(routeReadyMs).toBeLessThanOrEqual(budgets.routeReadyMs);
    expect(metrics.domContentLoadedMs).toBeLessThanOrEqual(budgets.domContentLoadedMs);
    expect(metrics.largestContentfulPaintMs).toBeLessThanOrEqual(budgets.largestContentfulPaintMs);
    expect(metrics.cumulativeLayoutShift).toBeLessThanOrEqual(budgets.cumulativeLayoutShift);
    expect(metrics.longTaskDurationMs).toBeLessThanOrEqual(budgets.longTaskDurationMs);
    expect(metrics.scriptBytes).toBeLessThanOrEqual(budgets.scriptBytes);
    expect(metrics.resourceRequests).toBeLessThanOrEqual(budgets.resourceRequests);
    expect(firstStepInteractionMs).toBeLessThanOrEqual(budgets.firstStepInteractionMs);
  });
});
