import { test, expect } from "@playwright/test";
import { register, trackErrors } from "./helpers";

test("communauté : publier un conseil, le commenter, le retrouver dans la liste", async ({ page }) => {
  const errors = trackErrors(page);
  await register(page, "commu");
  await page.goto("/communaute/nouveau");
  const form = page.getByRole("form", { name: "Partager un conseil" });
  const title = `Prendre le tram 28 tôt le matin ${Date.now()}`;
  await form.getByLabel("Titre").fill(title);
  await form.getByLabel("Votre conseil").fill("Montez au terminus Martim Moniz avant 8 h : le tram est presque vide et vous évitez une heure de file en journée.");
  await form.getByRole("button", { name: "Publier" }).click();
  await page.waitForURL(/\/communaute\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("textbox", { name: "Votre commentaire" }).fill("Confirmé, testé en mars : très efficace.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Confirmé, testé en mars : très efficace.")).toBeVisible();

  await page.goto("/communaute");
  await expect(page.getByText(title)).toBeVisible();
  expect(errors).toEqual([]);
});

test("communauté : un contenu promotionnel non déclaré est refusé", async ({ page }) => {
  await register(page, "promo");
  await page.goto("/communaute/nouveau");
  const form = page.getByRole("form", { name: "Partager un conseil" });
  await form.getByLabel("Titre").fill("Le meilleur code promo de Lisbonne");
  await form.getByLabel("Votre conseil").fill("Utilisez mon code promo DINO20 pour avoir -20 % sur toutes les réservations, offre limitée, profitez-en vite !");
  await form.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText(/semble promotionnel/)).toBeVisible();
});
