import { defineConfig, devices } from "@playwright/test";

// End-to-end journeys run against the production build (`pnpm e2e` builds first).
const PORT = 3005;
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "fr-FR", timezoneId: "Africa/Porto-Novo", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // NEXT_DIST_DIR is inherited from the `pnpm e2e` script.
  webServer: { command: `pnpm exec next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: false, timeout: 60_000 },
});
