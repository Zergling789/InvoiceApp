import { defineConfig } from "playwright/test";

const supabaseUrl =
  process.env.E2E_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://example.supabase.co";
const supabaseAnonKey =
  process.env.E2E_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "test-anon-key";

export default defineConfig({
  testDir: "tests",
  testMatch: "authenticated-mobile-performance.spec.ts",
  fullyParallel: false,
  workers: 1,
  outputDir: "test-results/performance",
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run build && npm run preview -- --host 0.0.0.0 --port 4173",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_SUPABASE_URL: supabaseUrl,
        VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
      },
    },
    {
      command: "npm run dev:server",
      url: "http://localhost:4000/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey,
        SUPABASE_SERVICE_ROLE:
          process.env.E2E_SUPABASE_SERVICE_ROLE ??
          process.env.SUPABASE_SERVICE_ROLE ??
          "missing-e2e-service-role",
      },
    },
  ],
});
