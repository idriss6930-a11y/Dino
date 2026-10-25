import { test, expect } from "@playwright/test";
import { inDays, PASSWORD, register, trackErrors } from "./helpers";

test("compte : inscription, alerte de prix, export RGPD puis suppression", async ({ page }) => {
  const errors = trackErrors(page);
  const email = await register(page, "compte");

  // Recherche puis alerte sur cette route.
  await page.goto(`/vols?trip=roundtrip&origin=CDG&destination=LIS&departDate=${inDays(50)}&returnDate=${inDays(57)}&adults=1`);
  await expect(page.getByTestId("flight-offer").first()).toBeVisible();
  await page.getByRole("button", { name: "Créer une alerte" }).click();
  await expect(page.getByText(/Alerte créée/)).toBeVisible();
  await page.goto("/alertes");
  await expect(page.getByTestId("alert")).toHaveCount(1);

  // Export : un vrai JSON contenant le compte, sans hash de mot de passe.
  const res = await page.request.get("/api/me/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toMatch(/attachment/);
  const body = await res.text();
  expect(body).toContain(email);
  expect(body).not.toMatch(/passwordHash|scrypt\$/);
  expect(JSON.parse(body).alerts?.length).toBe(1);

  // Suppression : le bouton reste désactivé tant que SUPPRIMER n'est pas tapé.
  await page.goto("/compte");
  const del = page.getByRole("form", { name: "Supprimer mon compte" });
  await del.getByPlaceholder("Mot de passe").fill(PASSWORD);
  const btn = del.getByRole("button", { name: "Supprimer définitivement" });
  await expect(btn).toBeDisabled();
  await del.getByPlaceholder("Tapez SUPPRIMER").fill("SUPPRIMER");
  await btn.click();
  await page.waitForURL(/compte-supprime=1/);

  // Le compte n'existe plus : la connexion échoue.
  await page.goto("/compte/connexion");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert").or(page.getByText(/incorrect|invalide/i)).first()).toBeVisible();
  expect(errors.filter((e) => !/401|400/.test(e))).toEqual([]);
});

test("connexion : un lien de redirection externe est ignoré", async ({ page }) => {
  const email = await register(page, "redir");
  await page.request.post("/api/auth/logout", { headers: { origin: new URL(page.url()).origin } });
  await page.goto("/compte/connexion?next=https://evil.example/");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/compte/connexion"));
  expect(page.url()).toMatch(/^http:\/\/localhost:\d+\//);
});
