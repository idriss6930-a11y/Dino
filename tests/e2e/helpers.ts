import { expect, type Page } from "@playwright/test";

export const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@dino.example`;
export const PASSWORD = "phrase-de-passe-e2e-42";

/** Collecte les erreurs JavaScript de la page pour échouer en cas d'exception non gérée. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Les tuiles et services externes peuvent être bloqués selon le réseau : on ne retient que les erreurs applicatives.
    if (m.type() === "error" && !/Failed to load resource|tile\.openstreetmap|net::ERR/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

export async function register(page: Page, tag: string) {
  const email = uniqueEmail(tag);
  await page.goto("/compte/inscription");
  await page.getByLabel("Nom affiché").fill(`Testeur ${tag}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/compte\?bienvenue=1/);
  return email;
}

/** Date ISO dans n jours (fuseau local du navigateur de test). */
export function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "la page ne doit pas défiler horizontalement").toBeLessThanOrEqual(1);
}
