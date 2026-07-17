import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "tests",
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL:
        process.env.E2E_SUPABASE_URL ??
        process.env.VITE_SUPABASE_URL ??
        "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY:
        process.env.E2E_SUPABASE_ANON_KEY ??
        process.env.VITE_SUPABASE_ANON_KEY ??
        "test-anon-key",
    },
  },
});
