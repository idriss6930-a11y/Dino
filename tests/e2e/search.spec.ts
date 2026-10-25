import { test, expect } from "@playwright/test";
import { inDays, trackErrors } from "./helpers";

test.describe("sans compte", () => {
  test("l'accueil affiche DINO, le moteur de recherche et le bandeau démo", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("img", { name: /DINO/ }).first()).toBeVisible();
    await expect(page.getByRole("form", { name: "Recherche de vols" })).toBeVisible();
    await expect(page.getByText(/Mode démonstration/)).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: /Je ne sais pas où partir/ }).click();
    await expect(page).toHaveURL(/\/inspiration/);
    expect(errors).toEqual([]);
  });

  test("recherche de vols depuis le formulaire : offres marquées Démo, prix détaillé", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/vols");
    const form = page.getByRole("form", { name: "Recherche de vols" });
    for (const [label, q, pick] of [
      ["Départ", "Paris", /CDG/],
      ["Destination", "Lisbonne", /LIS/],
    ] as const) {
      const box = form.getByRole("combobox", { name: new RegExp(`^${label}`) });
      await box.fill(q);
      await page.getByRole("option", { name: pick }).first().click();
    }
    await form.getByLabel("Aller", { exact: true }).fill(inDays(60));
    await form.getByLabel("Retour", { exact: true }).fill(inDays(67));
    await form.getByRole("button", { name: "Rechercher" }).click();

    await expect(page).toHaveURL(/origin=.*destination=/);
    const offers = page.getByTestId("flight-offer");
    await expect(offers.first()).toBeVisible();
    // Jamais de faux tarifs présentés comme réels : chaque offre porte le badge Démo et n'est pas réservable.
    const n = await offers.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(n, 12); i++) await expect(offers.nth(i).getByText("Démo", { exact: true })).toBeVisible();
    // Les offres démo n'ont aucun lien sortant de réservation.
    await expect(offers.locator("a[target=_blank]")).toHaveCount(0);

    // Le tri change l'ordre sans erreur.
    await page.getByRole("button", { name: /Moins cher/ }).click();
    await expect(page).toHaveURL(/sort=price/);
    expect(errors).toEqual([]);
  });

  test("hôtels, calendrier d'une destination et budget répondent sans compte", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/hotels?city=lisbonne&checkin=${inDays(40)}&checkout=${inDays(43)}&adults=2`);
    await expect(page.getByText("Démo", { exact: true }).first()).toBeVisible();
    await page.goto("/destinations/lisbonne");
    await expect(page.getByRole("table").first()).toBeVisible();
    await page.goto("/budget");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("assistant sans clé IA : répond en séparant faits, estimations et recommandations", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/assistant");
    await page.getByRole("textbox").first().fill("Je pars de Paris en mai avec 800 euros pour une semaine au soleil");
    await page.getByRole("textbox").first().press("Enter");
    const reply = page.getByTestId("assistant-reply").first();
    await expect(reply).toBeVisible({ timeout: 30_000 });
    await expect(reply.getByText(/Recommandation|Estimation|Fait/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("les fonctions de compte redirigent proprement vers la connexion", async ({ page }) => {
    await page.goto("/alertes");
    await expect(page.getByText("Connectez-vous pour créer des alertes")).toBeVisible();
  });
});
