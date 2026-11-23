import { expect, test } from "@playwright/test";
import { PASSWORD, alerts, createItem, register, trackErrors } from "./helpers";

test("l'accueil dit ce qui est réellement activé et ne contient ni lien cassé ni bouton mort", async ({ page, request }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Une annonce.");
  await expect(page.getByText("la rédaction par IA n'est pas activée")).toBeVisible();
  await expect(page.getByText("Le paiement en ligne n'est pas encore activé sur ce site.")).toBeVisible();
  await expect(page.getByText("9,90 € par mois")).toBeVisible();

  const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!.split("#")[0]))]);
  for (const href of hrefs) expect((await request.get(href)).status(), `lien ${href}`).toBe(200);
  expect(await page.locator("a:not([href]), a[href='#'], a[href='']").count()).toBe(0);
  expect(errors).toEqual([]);
});

test("en-têtes de sécurité, pages protégées et contrôle d'origine", async ({ page, request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-powered-by"]).toBeUndefined();

  for (const path of ["/app", "/app/nouveau", "/app/compte", "/app/articles/abc"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/connexion\?next=/);
  }
  expect((await request.post("/api/items", { data: { kind: "veste" } })).status()).toBe(401);
  expect((await request.get("/api/me/export")).status()).toBe(401);
  expect((await request.post("/api/auth/login", { data: { email: "a@b.fr", password: "x" }, headers: { Origin: "https://site-malveillant.example" } })).status()).toBe(403);
  expect((await request.post("/api/billing/webhook", { data: { id: "evt_faux", type: "checkout.session.completed" }, headers: { "stripe-signature": "t=1,v1=00" } })).status()).toBe(400);
  expect((await request.get("/api/photos/jeton-qui-n-existe-pas-0123456789")).status()).toBe(404);
});

test("un article n'est visible que par son propriétaire", async ({ page, browser }) => {
  await register(page, "proprio");
  await createItem(page, { kind: "manteau en laine" });
  const url = page.url();
  const other = await browser.newContext();
  const stranger = await other.newPage();
  await register(stranger, "intrus");
  const res = await stranger.goto(url);
  expect(res?.status()).toBe(404);
  await expect(stranger.getByText("Page introuvable")).toBeVisible();
  const id = url.split("/").pop()!;
  expect((await stranger.request.patch(`/api/items/${id}`, { data: { title: "volé" } })).status()).toBe(404);
  expect((await stranger.request.post(`/api/items/${id}/sold`, { data: { platform: "vinted", soldCents: 100 } })).status()).toBe(404);
  await other.close();
});

test("compte : connexion, export des données, suppression", async ({ page }) => {
  const email = await register(page, "compte");
  await createItem(page, { kind: "robe d'été" });
  await page.goto("/app/compte");
  await expect(page.getByText("1 article créé sur 10 ce mois-ci")).toBeVisible();
  await expect(page.getByText("Le paiement en ligne n'est pas encore activé")).toBeVisible();

  const data = await (await page.request.get("/api/me/export")).json();
  expect(data.user.email).toBe(email);
  expect(data.items).toHaveLength(1);
  expect(JSON.stringify(data)).not.toMatch(/scrypt|passwordHash|tokenHash/);

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await page.waitForURL(/\/$/);
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(alerts(page)).toHaveText("E-mail ou mot de passe incorrect");
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByText("Robe d'été")).toBeVisible();

  await page.goto("/app/compte");
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.waitForURL(/compte=supprime/);
  await expect(page.getByText("Votre compte et toutes vos données ont été supprimés.")).toBeVisible();
  await page.goto("/app");
  await expect(page).toHaveURL(/\/connexion/);
});

test("aucun secret serveur dans le code envoyé au navigateur", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (/\.js(\?|$)/.test(r.url())) bodies.push(await r.text().catch(() => ""));
  });
  await register(page, "secrets");
  await createItem(page, { kind: "pull" });
  const all = bodies.join("\n");
  for (const marker of ["whsec_e2e_only", "STRIPE_SECRET_KEY", "EBAY_CLIENT_SECRET", "APP_SECRET", "Tu rédiges des annonces"]) expect(all.includes(marker), marker).toBe(false);
});
