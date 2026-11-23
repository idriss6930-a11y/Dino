import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { authenticate, createSession, deleteAccount, exportUserData, getUserBySessionToken, registerUser, requestPasswordReset, resetPassword } from "@/lib/services/auth";
import { applyStripeEvent, createCheckout, verifyStripeSignature } from "@/lib/services/billing";
import { decryptSecret, encryptSecret } from "@/lib/services/crypto";
import { sniffImage } from "@/lib/services/images";
import { addPhoto, cancelSale, createItem, dashboardStats, deleteItem, generateForItem, getItem, listItems, markSold, readPhoto, setListing, updateItem } from "@/lib/services/items";
import { LIMITS, getUsage } from "@/lib/services/plans";
import { connectEbay, publishToEbay } from "@/lib/ebay/client";
import { EBAY_CONDITION, ebayErrorMessage, inventoryItemPayload, offerPayload, skuFor } from "@/lib/ebay/payloads";

const PW = "phrase-de-passe-solide-42";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
let n = 0;
async function newUser(plan: "free" | "premium" = "free") {
  const email = `u${++n}-${Date.now()}@placard.example`;
  const { id } = await registerUser({ email, password: PW, displayName: "Vendeuse Test", acceptTerms: true });
  if (plan === "premium") await (await getDb()).update(s.users).set({ plan }).where(eq(s.users.id, id));
  return { id, plan, email };
}
const veste = { kind: "veste en jean", brand: "Levi's", size: "M", color: "bleu", condition: "good", purchaseCents: 500 };

beforeAll(async () => {
  await getDb();
});

describe("comptes", () => {
  it("inscrit, connecte, refuse un mauvais mot de passe sans dire si le compte existe", async () => {
    const u = await newUser();
    expect((await authenticate(u.email, PW, "1.1.1.1")).userId).toBe(u.id);
    await expect(authenticate(u.email, "mauvais-mot-de-passe", "1.1.1.1")).rejects.toThrow("E-mail ou mot de passe incorrect");
    await expect(authenticate("inconnu@placard.example", PW, "1.1.1.1")).rejects.toThrow("E-mail ou mot de passe incorrect");
    await expect(registerUser({ email: u.email, password: PW, displayName: "Autre", acceptTerms: true })).rejects.toThrow(/Impossible de créer/);
    await expect(registerUser({ email: "x@placard.example", password: "court", displayName: "Autre", acceptTerms: true })).rejects.toThrow();
  });
  it("ouvre une session opaque et réinitialise le mot de passe en déconnectant les appareils", async () => {
    const u = await newUser();
    const { token } = await createSession(u.id);
    expect((await getUserBySessionToken(token))?.email).toBe(u.email);
    expect(await getUserBySessionToken("jeton-invente")).toBeNull();
    const reset = await requestPasswordReset(u.email, "http://localhost");
    await resetPassword(reset!, "nouvelle-phrase-de-passe-77");
    expect(await getUserBySessionToken(token)).toBeNull();
    await expect(resetPassword(reset!, "encore-une-autre-phrase-88")).rejects.toThrow(/invalide ou expiré/);
    expect(await requestPasswordReset("inconnu@placard.example", "http://localhost")).toBeUndefined();
  });
  it("exporte les données sans le mot de passe, puis supprime tout le compte", async () => {
    const u = await newUser();
    const item = await createItem(u, veste);
    await addPhoto(u.id, item.id, JPEG);
    const data = await exportUserData(u.id);
    expect(JSON.stringify(data)).not.toContain("scrypt$");
    expect(data.items).toHaveLength(1);
    expect(JSON.stringify(data.photos)).not.toContain("dataB64");
    await expect(deleteAccount(u.id, "mauvais")).rejects.toThrow("Mot de passe incorrect");
    await deleteAccount(u.id, PW);
    const db = await getDb();
    expect(await db.select().from(s.items).where(eq(s.items.userId, u.id))).toHaveLength(0);
    expect(await db.select().from(s.photos).where(eq(s.photos.userId, u.id))).toHaveLength(0);
  });
});

describe("articles", () => {
  it("cloisonne les articles entre utilisateurs", async () => {
    const a = await newUser(), b = await newUser();
    const item = await createItem(a, veste);
    await expect(getItem(b.id, item.id)).rejects.toThrow("Article introuvable");
    await expect(updateItem(b.id, item.id, { title: "volé" })).rejects.toThrow("Article introuvable");
    await expect(deleteItem(b.id, item.id)).rejects.toThrow("Article introuvable");
    await expect(addPhoto(b.id, item.id, JPEG)).rejects.toThrow("Article introuvable");
    expect(await listItems(b.id)).toHaveLength(0);
  });
  it("applique le quota gratuit, même après suppression, et pas en Premium", async () => {
    const u = await newUser();
    for (let i = 0; i < LIMITS.free.itemsPerMonth; i++) await deleteItem(u.id, (await createItem(u, veste)).id);
    await expect(createItem(u, veste)).rejects.toThrow(/limite de 10 articles/);
    expect((await getUsage(u.id)).itemsCreated).toBe(10);
    const p = await newUser("premium");
    for (let i = 0; i < 12; i++) await createItem(p, veste);
    expect(await listItems(p.id)).toHaveLength(12);
  });
  it("rédige par règles sans clé, sans consommer de quota d'IA, et marque le texte retouché comme manuel", async () => {
    const u = await newUser();
    const item = await createItem(u, veste);
    const g = await generateForItem(u, item.id);
    expect(g.item.writtenBy).toBe("rules");
    expect(g.item.title).toContain("Levi's");
    expect(g.item.estimateLowCents).toBeNull();
    expect((await getUsage(u.id)).aiGenerations).toBe(0);
    expect((await updateItem(u.id, item.id, { priceCents: 2500 })).writtenBy).toBe("rules");
    expect((await updateItem(u.id, item.id, { title: "Mon titre" })).writtenBy).toBe("manual");
  });
  it("avec une clé, enregistre l'estimation de l'IA et compte la rédaction", async () => {
    const u = await newUser();
    const item = await createItem(u, veste);
    await addPhoto(u.id, item.id, JPEG);
    process.env.ANTHROPIC_API_KEY = "test";
    try {
      let seenPhotos = 0;
      const g = await generateForItem(u, item.id, async (_facts, photos) => {
        seenPhotos = photos.length;
        return { text: { title: "Veste Levi's", description: "Belle veste.", hashtags: ["veste"] }, writtenBy: "claude", estimate: { lowCents: 2000, highCents: 3500 }, estimateNote: "Estimation générale.", cautions: ["Vérifier la taille"], notice: null };
      });
      expect(seenPhotos).toBe(1);
      expect(g.item.writtenBy).toBe("claude");
      expect(g.item.estimateHighCents).toBe(3500);
      expect(g.cautions).toEqual(["Vérifier la taille"]);
      expect((await getUsage(u.id)).aiGenerations).toBe(1);
    } finally {
      process.env.ANTHROPIC_API_KEY = "";
    }
  });
  it("n'accepte que de vraies images, cinq au plus, lisibles par leur jeton", async () => {
    const u = await newUser();
    const item = await createItem(u, veste);
    await expect(addPhoto(u.id, item.id, new TextEncoder().encode("<script>alert(1)</script>"))).rejects.toThrow(/Format non reconnu/);
    const { id } = await addPhoto(u.id, item.id, JPEG);
    expect((await readPhoto(id))?.mime).toBe("image/jpeg");
    expect(await readPhoto("../../etc/passwd")).toBeNull();
    for (let i = 0; i < 4; i++) await addPhoto(u.id, item.id, JPEG);
    await expect(addPhoto(u.id, item.id, JPEG)).rejects.toThrow(/5 photos au plus/);
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe("image/png");
  });
});

describe("ventes", () => {
  it("vendu sur une plateforme : les autres passent en « à retirer », et le bénéfice est net", async () => {
    const u = await newUser();
    const item = await createItem(u, veste);
    await expect(setListing(u.id, item.id, { platform: "vinted", status: "online" })).rejects.toThrow(/Rédigez d'abord/);
    await generateForItem(u, item.id);
    await setListing(u.id, item.id, { platform: "vinted", status: "online" });
    const afterDepop = await setListing(u.id, item.id, { platform: "depop", status: "online" });
    expect(afterDepop.item.status).toBe("online");

    const sold = await markSold(u.id, item.id, { platform: "vinted", soldCents: 2000, feesCents: 0, shippingCents: 300 });
    const by = Object.fromEntries(sold.listings.map((l) => [l.platform, l.status]));
    expect(by).toEqual({ vinted: "sold", depop: "to_remove" });
    await expect(markSold(u.id, item.id, { platform: "depop", soldCents: 1 })).rejects.toThrow(/déjà marqué/);
    await expect(setListing(u.id, item.id, { platform: "ebay", status: "online" })).rejects.toThrow(/vendu/);

    const stats = await dashboardStats(u.id);
    expect(stats).toMatchObject({ soldCount: 1, soldThisMonth: 1, profitThisMonthCents: 1200, toRemove: 1, inStock: 0, soldWithoutPurchasePrice: 0 });
    await setListing(u.id, item.id, { platform: "depop", status: "removed" });
    expect((await dashboardStats(u.id)).toRemove).toBe(0);

    const back = await cancelSale(u.id, item.id);
    expect(back.item.status).toBe("online");
    expect(back.item.soldCents).toBeNull();
    expect((await dashboardStats(u.id)).soldCount).toBe(0);
  });
  it("retire automatiquement une annonce publiée par API quand l'article se vend ailleurs", async () => {
    const u = await newUser();
    const item = await createItem(u, veste);
    await generateForItem(u, item.id);
    await setListing(u.id, item.id, { platform: "ebay", status: "online" }, { externalId: "offer-1", externalUrl: "https://www.ebay.fr/itm/1" });
    await setListing(u.id, item.id, { platform: "depop", status: "online" });
    const withdrawn: string[] = [];
    const sold = await markSold(u.id, item.id, { platform: "other", soldCents: 1500 }, async (_uid, l) => {
      withdrawn.push(l.externalId!);
      return true;
    });
    expect(withdrawn).toEqual(["offer-1"]);
    expect(Object.fromEntries(sold.listings.map((l) => [l.platform, l.status]))).toEqual({ ebay: "removed", depop: "to_remove" });
  });
  it("signale un bénéfice surestimé quand le prix d'achat manque", async () => {
    const u = await newUser();
    const item = await createItem(u, { ...veste, purchaseCents: null });
    await markSold(u.id, item.id, { platform: "other", soldCents: 1000 });
    expect(await dashboardStats(u.id)).toMatchObject({ profitTotalCents: 1000, soldWithoutPurchasePrice: 1 });
  });
});

describe("abonnement", () => {
  const secret = "whsec_test";
  const sign = (body: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
  it("n'accepte qu'une signature Stripe valide et récente", () => {
    const body = JSON.stringify({ id: "evt_1" });
    expect(verifyStripeSignature(body, sign(body), secret)).toBe(true);
    expect(verifyStripeSignature(body + " ", sign(body), secret)).toBe(false);
    expect(verifyStripeSignature(body, sign(body), "autre")).toBe(false);
    expect(verifyStripeSignature(body, sign(body, Math.floor(Date.now() / 1000) - 3600), secret)).toBe(false);
    expect(verifyStripeSignature(body, null, secret)).toBe(false);
    expect(verifyStripeSignature(body, "t=abc,v1=00", secret)).toBe(false);
  });
  it("passe en Premium au paiement, une seule fois par événement, et revient en gratuit à la résiliation", async () => {
    const u = await newUser();
    const db = await getDb();
    const plan = async () => (await db.select().from(s.users).where(eq(s.users.id, u.id)))[0].plan;
    const cus = `cus_${u.id}`;
    const paid = { id: `evt_a_${u.id}`, type: "checkout.session.completed", data: { object: { client_reference_id: u.id, customer: cus, subscription: "sub_1" } } };
    expect(await applyStripeEvent(paid)).toBe("applied");
    expect(await plan()).toBe("premium");
    expect(await applyStripeEvent(paid)).toBe("duplicate");
    expect(await applyStripeEvent({ id: `evt_b_${u.id}`, type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: cus, status: "unpaid" } } })).toBe("applied");
    expect(await plan()).toBe("free");
    expect(await applyStripeEvent({ id: `evt_c_${u.id}`, type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: cus, status: "active" } } })).toBe("applied");
    expect(await plan()).toBe("premium");
    expect(await applyStripeEvent({ id: `evt_d_${u.id}`, type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: cus, status: "canceled" } } })).toBe("applied");
    expect(await plan()).toBe("free");
    expect(await applyStripeEvent({ id: `evt_e_${u.id}`, type: "invoice.paid", data: { object: {} } })).toBe("ignored");
  });
  it("refuse d'ouvrir un paiement tant que Stripe n'est pas configuré", async () => {
    const u = await newUser();
    await expect(createCheckout(u.id)).rejects.toThrow(/pas encore activé/);
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PRICE_ID = "price_x";
    try {
      let sent = "";
      const url = await createCheckout(u.id, (async (_url: string, init: RequestInit) => {
        sent = String(init.body);
        return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/x" }));
      }) as unknown as typeof fetch);
      expect(url).toBe("https://checkout.stripe.com/c/pay/x");
      const p = new URLSearchParams(sent);
      expect(p.get("mode")).toBe("subscription");
      expect(p.get("client_reference_id")).toBe(u.id);
      expect(p.get("line_items[0][price]")).toBe("price_x");
    } finally {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_PRICE_ID;
    }
  });
});

describe("eBay", () => {
  it("chiffre les jetons et détecte toute altération", () => {
    const enc = encryptSecret("jeton-de-renouvellement");
    expect(enc).not.toContain("jeton");
    expect(decryptSecret(enc)).toBe("jeton-de-renouvellement");
    expect(() => decryptSecret(enc.slice(0, -2) + "xx")).toThrow();
  });
  it("construit les requêtes attendues par l'API", () => {
    const facts = { kind: "veste", brand: "", size: "M", color: "bleu", material: "", audience: "femme" as const, condition: "good" as const, defects: "bouton manquant", notes: "" };
    const inv = inventoryItemPayload({ title: "T".repeat(100), description: "D", hashtags: [] }, facts, ["https://x/1.jpg"]);
    expect(inv.product.title.length).toBeLessThanOrEqual(80);
    expect(inv.condition).toBe("USED_EXCELLENT");
    expect(inv.conditionDescription).toBe("bouton manquant");
    expect(inv.product.aspects).toEqual({ Marque: ["Sans marque"], Taille: ["M"], Couleur: ["bleu"] });
    expect(EBAY_CONDITION.new_tags).toBe("NEW");
    const offer = offerPayload({ sku: "s", categoryId: "11483", priceCents: 2550, description: "a\nb", merchantLocationKey: "loc", policies: { fulfillmentPolicyId: "f", paymentPolicyId: "p", returnPolicyId: "r" } });
    expect(offer.pricingSummary.price).toEqual({ value: "25.50", currency: "EUR" });
    expect(offer.listingDescription).toBe("a<br>b");
    expect(skuFor("ab-cd")).toBe("placard-abcd");
    expect(ebayErrorMessage({ errors: [{ message: "court", longMessage: "long" }] })).toBe("long");
    expect(ebayErrorMessage(null)).toBe(null);
  });
  it("enchaîne connexion, publication et renvoie l'adresse de l'annonce (réponses d'exemple)", async () => {
    Object.assign(process.env, { EBAY_CLIENT_ID: "id", EBAY_CLIENT_SECRET: "sec", EBAY_RU_NAME: "ru", APP_URL: "https://placard.example" });
    try {
      const u = await newUser();
      const item = await createItem(u, veste);
      await addPhoto(u.id, item.id, JPEG);
      await generateForItem(u, item.id);
      const priced = await updateItem(u.id, item.id, { priceCents: 2500 });
      const calls: Array<{ method: string; path: string; body: unknown }> = [];
      const fake = (async (url: string, init: RequestInit) => {
        const path = new URL(url).pathname;
        calls.push({ method: init.method ?? "GET", path, body: init.body && String(init.headers && (init.headers as Record<string, string>)["Content-Type"]).includes("json") ? JSON.parse(String(init.body)) : String(init.body ?? "") });
        const json = (o: unknown) => new Response(JSON.stringify(o));
        if (path.endsWith("/oauth2/token")) return json({ access_token: "acc", expires_in: 7200, refresh_token: "ref", refresh_token_expires_in: 1000 });
        if (path.endsWith("/fulfillment_policy")) return json({ fulfillmentPolicies: [{ fulfillmentPolicyId: "f1" }] });
        if (path.endsWith("/payment_policy")) return json({ paymentPolicies: [{ paymentPolicyId: "p1" }] });
        if (path.endsWith("/return_policy")) return json({ returnPolicies: [{ returnPolicyId: "r1" }] });
        if (path.endsWith("/location")) return json({ locations: [{ merchantLocationKey: "maison" }] });
        if (path.endsWith("/get_default_category_tree_id")) return json({ categoryTreeId: "71" });
        if (path.endsWith("/get_category_suggestions")) return json({ categorySuggestions: [{ category: { categoryId: "11483" } }] });
        if (path.includes("/inventory_item/")) return new Response(null, { status: 204 });
        if (path.endsWith("/offer")) return json({ offerId: "off-9" });
        if (path.endsWith("/publish")) return json({ listingId: "1234567890" });
        return new Response("{}", { status: 404 });
      }) as unknown as typeof fetch;

      await expect(publishToEbay(u.id, priced, fake)).rejects.toThrow(/Connectez d'abord/);
      await connectEbay(u.id, "code-d-autorisation", fake);
      const [acct] = await (await getDb()).select().from(s.ebayAccounts).where(eq(s.ebayAccounts.userId, u.id));
      expect(acct.refreshTokenEnc).not.toContain("ref");
      const out = await publishToEbay(u.id, priced, fake);
      expect(out).toEqual({ externalId: "off-9", externalUrl: "https://www.ebay.fr/itm/1234567890" });
      const put = calls.find((c) => c.method === "PUT")!;
      expect((put.body as { product: { imageUrls: string[] } }).product.imageUrls[0]).toMatch(/^https:\/\/placard\.example\/api\/photos\//);
      const offer = calls.find((c) => c.path.endsWith("/offer"))!.body as { categoryId: string; listingPolicies: unknown };
      expect(offer.categoryId).toBe("11483");
      expect(offer.listingPolicies).toEqual({ fulfillmentPolicyId: "f1", paymentPolicyId: "p1", returnPolicyId: "r1" });
    } finally {
      for (const k of ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_RU_NAME", "APP_URL"]) delete process.env[k];
    }
  });
});
