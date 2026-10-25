import { test, expect, type Page } from "@playwright/test";
import { E2E_CRON_SECRET } from "../../playwright.config";

const PAGES = ["/", "/vols", "/hotels", "/inspiration", "/destinations", "/destinations/lisbonne", "/carte", "/assistant", "/budget", "/bons-plans", "/tendances", "/communaute", "/sources", "/confidentialite", "/compte/connexion", "/compte/inscription"];

test("en-têtes de sécurité et API non mise en cache", async ({ request }) => {
  const page = await request.get("/");
  const h = page.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-powered-by"]).toBeUndefined();
  const api = await request.get("/api/status");
  expect(api.headers()["cache-control"]).toContain("no-store");
});

test("routes protégées : cron sans secret, admin et modération sans session", async ({ request }) => {
  expect((await request.post("/api/cron/alerts")).status()).toBe(401);
  expect((await request.post("/api/cron/alerts", { headers: { authorization: "Bearer mauvais-secret-de-test-xx" } })).status()).toBe(401);
  expect([401, 403]).toContain((await request.get("/api/moderation")).status());
  expect([401, 403]).toContain((await request.post("/api/admin/climate", { headers: { origin: "http://localhost" } })).status());
  expect((await request.get("/api/me/export")).status()).toBe(401);
});

test("protection CSRF : une écriture depuis une autre origine est refusée", async ({ request }) => {
  const r = await request.post("/api/auth/login", { headers: { origin: "https://evil.example" }, data: { email: "x@y.z", password: "abcdefghijkl" } });
  expect(r.status()).toBe(403);
});

test("aucun secret serveur n'atteint le navigateur", async ({ page, request }) => {
  const seen: string[] = [];
  page.on("response", async (r) => {
    const t = r.headers()["content-type"] ?? "";
    if (/javascript|html|json|css/.test(t)) seen.push(await r.text().catch(() => ""));
  });
  for (const p of PAGES) await page.goto(p);
  const status = await request.get("/api/status");
  seen.push(await status.text());
  const all = seen.join("\n");
  expect(all.length).toBeGreaterThan(10_000);
  expect(all).not.toContain(E2E_CRON_SECRET);
  // Motifs de clés connus (Anthropic, Duffel, clé privée).
  expect(all).not.toMatch(/sk-ant-[A-Za-z0-9_-]{10,}|duffel_(live|test)_[A-Za-z0-9]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/);
});

/** Lit les props React attachées au nœud DOM pour savoir si un bouton a réellement un gestionnaire. */
async function deadButtons(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const b of Array.from(document.querySelectorAll("button"))) {
      if ((b as HTMLButtonElement).disabled) continue;
      const key = Object.keys(b).find((k) => k.startsWith("__reactProps$"));
      const props = key ? (b as unknown as Record<string, Record<string, unknown>>)[key] : {};
      const submits = (b as HTMLButtonElement).type === "submit" && !!b.closest("form");
      const handled = typeof props.onClick === "function" || typeof props.onMouseDown === "function" || typeof props.onPointerDown === "function";
      if (!submits && !handled) out.push((b.textContent || b.getAttribute("aria-label") || b.outerHTML).trim().slice(0, 80));
    }
    return out;
  });
}

test("aucun bouton décoratif : chaque bouton a une action", async ({ page }) => {
  const problems: string[] = [];
  for (const p of [...PAGES, "/vols?trip=roundtrip&origin=CDG&destination=LIS&departDate=2027-05-10&returnDate=2027-05-17&adults=1"]) {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    for (const d of await deadButtons(page)) problems.push(`${p} → ${d}`);
  }
  expect(problems).toEqual([]);
});

test("aucun lien interne cassé depuis les pages principales", async ({ page, request }) => {
  const links = new Set<string>();
  for (const p of PAGES) {
    await page.goto(p);
    for (const href of await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")!))) links.add(href.split("#")[0]);
  }
  const broken: string[] = [];
  for (const href of links) {
    if (href.startsWith("/api/me/export")) continue; // nécessite une session, testé ailleurs
    const r = await request.get(href, { maxRedirects: 3 });
    if (r.status() >= 400) broken.push(`${href} (${r.status()})`);
  }
  expect(broken).toEqual([]);
});
