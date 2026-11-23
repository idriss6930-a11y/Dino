import { deflateSync } from "node:zlib";
import { expect, type Page } from "@playwright/test";

export const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@placard.example`;
export const PASSWORD = "phrase-de-passe-e2e-42";

/** Fabrique un vrai PNG uni (8×8), que le navigateur sait décoder et convertir en JPEG. */
function makePng(size = 8): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => (buf.reduce((c, b) => crcTable[(c ^ b) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4), sum = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits, RVB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x55)]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: size }, () => row)));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", pixels), chunk("IEND", Buffer.alloc(0))]);
}
export const PNG = makePng();

/** Collecte les erreurs JavaScript de la page pour échouer en cas d'exception non gérée. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

export async function register(page: Page, tag: string) {
  const email = uniqueEmail(tag);
  await page.goto("/inscription");
  await page.getByLabel("Prénom ou pseudo").fill(`Testeur ${tag}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/app\/nouveau\?bienvenue=1/);
  return email;
}

/** Crée un article par le formulaire et attend l'écran de l'article. */
export async function createItem(page: Page, facts: { kind: string; brand?: string; size?: string; defects?: string; purchase?: string }, withPhoto = false) {
  await page.goto("/app/nouveau");
  if (withPhoto) await page.getByLabel("Ajouter des photos").setInputFiles({ name: "veste.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("Type d'article").fill(facts.kind);
  if (facts.brand) await page.getByLabel("Marque").fill(facts.brand);
  if (facts.size) await page.getByLabel("Taille").fill(facts.size);
  if (facts.defects) await page.getByLabel("Défauts").fill(facts.defects);
  if (facts.purchase) await page.getByLabel("Prix d'achat (€)").fill(facts.purchase);
  await page.getByRole("button", { name: "Rédiger l'annonce" }).click();
  await page.waitForURL(/\/app\/articles\/[\w-]+$/);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "la page ne doit pas défiler horizontalement").toBeLessThanOrEqual(1);
}

/** Les messages d'erreur de l'application (Next ajoute son propre élément role="alert", vide, hors de <main>). */
export const alerts = (page: Page) => page.locator("main").getByRole("alert");
