import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout sur le build de production (npm run build d'abord).
 * Base PGlite en mémoire, mode démo forcé, aucun fournisseur réel ni clé : rien ne sort sur le réseau.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
export const E2E_CRON_SECRET = "e2e-cron-secret-should-never-leak-0001";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "fr-FR", timezoneId: "Europe/Paris", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/status`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: "memory://",
      DINO_DATA_MODE: "demo",
      DINO_SCHEDULER: "off",
      FX_PROVIDER: "builtin",
      INSECURE_COOKIES: "true",
      APP_URL: `http://localhost:${PORT}`,
      CRON_SECRET: E2E_CRON_SECRET,
      // Volontairement vides : aucun appel à un fournisseur réel pendant les tests.
      ANTHROPIC_API_KEY: "",
      DUFFEL_API_TOKEN: "",
      TRAVELPAYOUTS_TOKEN: "",
      LITEAPI_KEY: "",
    },
  },
});
