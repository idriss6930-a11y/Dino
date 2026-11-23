import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout sur le build de production (npm run build d'abord).
 * Base en mémoire, aucune clé : ni IA, ni eBay, ni Stripe ne sont appelés.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
// Certains environnements fournissent leur propre Chromium : on l'utilise s'il est là, sinon celui de Playwright.
const SYSTEM_CHROMIUM = process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium";
const launchOptions = fs.existsSync(SYSTEM_CHROMIUM) ? { executablePath: SYSTEM_CHROMIUM } : {};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "fr-FR", timezoneId: "Europe/Paris", trace: "off", launchOptions },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], permissions: ["clipboard-read", "clipboard-write"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/status`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: "memory://",
      INSECURE_COOKIES: "true",
      APP_URL: `http://localhost:${PORT}`,
      REGISTER_RATE_LIMIT: "1000",
      ANTHROPIC_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "whsec_e2e_only",
      EBAY_CLIENT_ID: "",
    },
  },
});
