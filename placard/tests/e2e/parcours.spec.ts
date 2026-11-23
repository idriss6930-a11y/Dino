import { expect, test } from "@playwright/test";
import { alerts, createItem, register, trackErrors } from "./helpers";

test("de la photo à la vente : rédaction, copie, mise en ligne, vente, retrait, bénéfice", async ({ page }) => {
  const errors = trackErrors(page);
  await register(page, "parcours");
  await expect(page.getByText("Bienvenue, Testeur parcours")).toBeVisible();

  await createItem(page, { kind: "veste en jean", brand: "Levi's", size: "M", defects: "petite tache sur la manche", purchase: "5" }, true);

  // L'annonce est rédigée par les règles, et le dit.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Veste en jean Levi's taille M");
  await expect(page.getByText("Rédigé par les règles automatiques")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Description", exact: true })).toHaveValue(/petite tache sur la manche/);
  await expect(page.getByText("La rédaction par IA n'est pas activée")).toBeVisible();
  await expect(page.getByText("Estimation de l'IA")).toHaveCount(0);
  await expect(page.getByText(/Vinted 5\s€ · eBay/)).toBeVisible();
  await expect(page.getByAltText("Photo 1 de l'article")).toBeVisible();
  expect(await page.getByAltText("Photo 1 de l'article").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // Prix, enregistrement.
  await page.getByLabel("Prix demandé (€)").fill("25");
  await expect(page.getByText("Modifications non enregistrées.")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();

  // Copie d'un champ au format Vinted.
  await page.getByRole("button", { name: "Copier : Titre" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Veste en jean Levi's taille M");
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("#secondemain");

  // Depop : pas de champ titre, état en anglais.
  await page.getByRole("tab", { name: "Depop" }).click();
  await expect(page.getByRole("button", { name: "Copier : Titre" })).toHaveCount(0);
  await expect(panel).toContainText("Used – Excellent");
  await page.getByRole("button", { name: "J'ai mis l'annonce en ligne" }).click();
  await expect(panel.getByText("Depop · en ligne")).toBeVisible();

  await page.getByRole("tab", { name: "Vinted" }).click();
  await page.getByRole("button", { name: "J'ai mis l'annonce en ligne" }).click();
  await expect(panel.getByText("Vinted · en ligne")).toBeVisible();

  // Vente sur Vinted : Depop doit être retiré.
  await expect(page.getByText(/Bénéfice net :/)).toContainText("20 €");
  await page.getByLabel("Envoi à votre charge (€)").fill("3");
  await page.getByRole("button", { name: "Marquer comme vendu" }).click();
  await expect(page.getByText("Cet article est vendu.")).toBeVisible();
  await expect(alerts(page)).toContainText("Retirez l'annonce sur Depop");
  await expect(page.getByRole("definition").last()).toContainText("17 €");

  // Le tableau de bord le rappelle.
  await page.goto("/app");
  await expect(alerts(page)).toContainText("Un article vendu est encore en ligne ailleurs.");
  await expect(page.getByText("Depop · à retirer")).toBeVisible();
  await expect(page.getByText("Bénéfice ce mois-ci").locator("..")).toContainText("17 €");

  await alerts(page).getByRole("link").click();
  await page.getByRole("tab", { name: "Depop" }).click();
  await page.getByRole("button", { name: "C'est retiré" }).click();
  await expect(page.getByText("Cet article est vendu.")).toHaveCount(0);
  await page.goto("/app");
  await expect(alerts(page)).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("une vente saisie par erreur s'annule, et un article se supprime", async ({ page }) => {
  await register(page, "annule");
  await createItem(page, { kind: "sac à main" });
  await page.getByLabel("Prix de vente (€)").fill("40");
  await page.getByRole("button", { name: "Marquer comme vendu" }).click();
  await expect(page.getByText("Sans prix d'achat, ce bénéfice est surestimé.")).toBeVisible();
  await page.getByRole("button", { name: "Annuler la vente" }).click();
  await expect(page.getByRole("heading", { name: "C'est vendu ?" })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer l'article" }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByText("Votre placard est vide")).toBeVisible();
});

test("la formule gratuite s'arrête à dix articles par mois, avec un message clair", async ({ page }) => {
  await register(page, "quota");
  for (let i = 0; i < 10; i++) {
    const res = await page.request.post("/api/items", { data: { kind: `article ${i}` } });
    expect(res.status()).toBe(200);
  }
  await page.goto("/app");
  await expect(page.getByText("10 / 10 articles créés ce mois-ci")).toBeVisible();
  await page.goto("/app/nouveau");
  await page.getByLabel("Type d'article").fill("un de trop");
  await page.getByRole("button", { name: "Rédiger l'annonce" }).click();
  await expect(alerts(page)).toContainText("limite de 10 articles par mois");
});
