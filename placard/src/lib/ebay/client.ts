/**
 * Connexion eBay : OAuth (code d'autorisation) puis publication par l'API officielle Sell Inventory.
 * Activée seulement si EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RU_NAME et APP_SECRET sont configurés.
 * Écrit d'après la documentation publique et testé sur des réponses d'exemple ; à valider en bac à sable
 * (EBAY_ENV=sandbox) avant toute mise en production.
 */
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { log } from "@/lib/log";
import { decryptSecret, encryptSecret, hasAppSecret } from "@/lib/services/crypto";
import { UserFacingError } from "@/lib/services/errors";
import type { Item, Listing } from "@/lib/services/items";
import type { ItemFacts } from "@/lib/listing/types";
import { EBAY_MARKETPLACE, ebayErrorMessage, inventoryItemPayload, offerPayload, skuFor, type EbayPolicies } from "./payloads";

type Fetch = typeof fetch;
const sandbox = () => process.env.EBAY_ENV === "sandbox";
const apiHost = () => (sandbox() ? "https://api.sandbox.ebay.com" : "https://api.ebay.com");
const authHost = () => (sandbox() ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com");
const SCOPES = ["https://api.ebay.com/oauth/api_scope", "https://api.ebay.com/oauth/api_scope/sell.inventory", "https://api.ebay.com/oauth/api_scope/sell.account.readonly"];

export const ebayConfigured = () => Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET && process.env.EBAY_RU_NAME && hasAppSecret());
const appUrl = () => (process.env.APP_URL || "").replace(/\/$/, "");
/** eBay télécharge les photos : il faut une adresse publique en https. */
export const ebayCanPublish = () => ebayConfigured() && appUrl().startsWith("https://");

export function authorizeUrl(state: string): string {
  const q = new URLSearchParams({ client_id: process.env.EBAY_CLIENT_ID!, redirect_uri: process.env.EBAY_RU_NAME!, response_type: "code", scope: SCOPES.join(" "), state });
  return `${authHost()}/oauth2/authorize?${q}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; refresh_token_expires_in?: number };

async function token(params: Record<string, string>, fetchImpl: Fetch): Promise<TokenResponse> {
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await fetchImpl(`${apiHost()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    log.warn("ebay_token_failed", { status: res.status });
    throw new UserFacingError("eBay a refusé la connexion. Reconnectez votre compte eBay depuis la page Compte.");
  }
  return (await res.json()) as TokenResponse;
}

/** Fin du parcours OAuth : échange le code contre des jetons et enregistre le jeton de renouvellement, chiffré. */
export async function connectEbay(userId: string, code: string, fetchImpl: Fetch = fetch) {
  const t = await token({ grant_type: "authorization_code", code, redirect_uri: process.env.EBAY_RU_NAME! }, fetchImpl);
  if (!t.refresh_token) throw new UserFacingError("eBay n'a pas fourni de jeton de renouvellement.");
  const db = await getDb();
  const values = { refreshTokenEnc: encryptSecret(t.refresh_token), refreshExpiresAt: t.refresh_token_expires_in ? new Date(Date.now() + t.refresh_token_expires_in * 1000) : null, connectedAt: new Date() };
  await db.insert(s.ebayAccounts).values({ userId, ...values }).onConflictDoUpdate({ target: s.ebayAccounts.userId, set: values });
}

export async function disconnectEbay(userId: string) {
  const db = await getDb();
  await db.delete(s.ebayAccounts).where(eq(s.ebayAccounts.userId, userId));
}

export async function ebayConnected(userId: string): Promise<boolean> {
  const db = await getDb();
  return (await db.select({ u: s.ebayAccounts.userId }).from(s.ebayAccounts).where(eq(s.ebayAccounts.userId, userId))).length > 0;
}

async function accessToken(userId: string, fetchImpl: Fetch): Promise<string> {
  const db = await getDb();
  const [acct] = await db.select().from(s.ebayAccounts).where(eq(s.ebayAccounts.userId, userId));
  if (!acct) throw new UserFacingError("Connectez d'abord votre compte eBay depuis la page Compte.");
  const t = await token({ grant_type: "refresh_token", refresh_token: decryptSecret(acct.refreshTokenEnc), scope: SCOPES.join(" ") }, fetchImpl);
  return t.access_token;
}

async function call<T>(fetchImpl: Fetch, access: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetchImpl(`${apiHost()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json", "Content-Language": "fr-FR", "Accept-Language": "fr-FR" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    log.warn("ebay_call_failed", { path: path.split("?")[0], status: res.status });
    throw new UserFacingError(`eBay a refusé l'opération : ${ebayErrorMessage(json) ?? `erreur ${res.status}`}`);
  }
  return json as T;
}

const factsOf = (i: Item): ItemFacts => ({ kind: i.kind, brand: i.brand, size: i.size, color: i.color, material: i.material, audience: i.audience, condition: i.condition, defects: i.defects, notes: i.notes });

/** Publie l'article sur eBay France et renvoie l'identifiant de l'offre et l'adresse de l'annonce. */
export async function publishToEbay(userId: string, item: Item, fetchImpl: Fetch = fetch): Promise<{ externalId: string; externalUrl: string }> {
  if (!ebayCanPublish()) throw new UserFacingError("La publication eBay n'est pas activée sur ce site.");
  if (!item.title.trim() || !item.description.trim()) throw new UserFacingError("Rédigez d'abord l'annonce.");
  if (!item.priceCents) throw new UserFacingError("Indiquez un prix avant de publier sur eBay.");
  const db = await getDb();
  const photos = await db.select({ id: s.photos.id }).from(s.photos).where(eq(s.photos.itemId, item.id)).orderBy(asc(s.photos.position));
  if (!photos.length) throw new UserFacingError("eBay exige au moins une photo.");

  const access = await accessToken(userId, fetchImpl);
  const get = <T,>(path: string) => call<T>(fetchImpl, access, "GET", path);
  const q = `marketplace_id=${EBAY_MARKETPLACE}`;
  const [fulfillment, payment, returns, locations] = await Promise.all([
    get<{ fulfillmentPolicies?: Array<{ fulfillmentPolicyId: string }> }>(`/sell/account/v1/fulfillment_policy?${q}`),
    get<{ paymentPolicies?: Array<{ paymentPolicyId: string }> }>(`/sell/account/v1/payment_policy?${q}`),
    get<{ returnPolicies?: Array<{ returnPolicyId: string }> }>(`/sell/account/v1/return_policy?${q}`),
    get<{ locations?: Array<{ merchantLocationKey: string }> }>(`/sell/inventory/v1/location`),
  ]);
  const policies: Partial<EbayPolicies> = {
    fulfillmentPolicyId: fulfillment.fulfillmentPolicies?.[0]?.fulfillmentPolicyId,
    paymentPolicyId: payment.paymentPolicies?.[0]?.paymentPolicyId,
    returnPolicyId: returns.returnPolicies?.[0]?.returnPolicyId,
  };
  const merchantLocationKey = locations.locations?.[0]?.merchantLocationKey;
  if (!policies.fulfillmentPolicyId || !policies.paymentPolicyId || !policies.returnPolicyId || !merchantLocationKey) {
    throw new UserFacingError("Votre compte eBay doit d'abord avoir des règles de vente (livraison, paiement, retours) et un lieu d'expédition. Créez-les une fois dans votre espace vendeur eBay, puis réessayez.");
  }

  const tree = await get<{ categoryTreeId: string }>(`/commerce/taxonomy/v1/get_default_category_tree_id?${q}`);
  const suggestions = await get<{ categorySuggestions?: Array<{ category: { categoryId: string } }> }>(`/commerce/taxonomy/v1/category_tree/${tree.categoryTreeId}/get_category_suggestions?q=${encodeURIComponent(item.title)}`);
  const categoryId = suggestions.categorySuggestions?.[0]?.category.categoryId;
  if (!categoryId) throw new UserFacingError("eBay n'a pas trouvé de catégorie pour ce titre. Précisez le type d'article dans le titre.");

  const sku = skuFor(item.id);
  const text = { title: item.title, description: item.description, hashtags: item.hashtags };
  await call(fetchImpl, access, "PUT", `/sell/inventory/v1/inventory_item/${sku}`, inventoryItemPayload(text, factsOf(item), photos.map((p) => `${appUrl()}/api/photos/${p.id}`)));
  const offer = await call<{ offerId: string }>(fetchImpl, access, "POST", `/sell/inventory/v1/offer`, offerPayload({ sku, categoryId, priceCents: item.priceCents, description: item.description, merchantLocationKey, policies: policies as EbayPolicies }));
  const published = await call<{ listingId: string }>(fetchImpl, access, "POST", `/sell/inventory/v1/offer/${offer.offerId}/publish`);
  return { externalId: offer.offerId, externalUrl: `https://www.ebay.fr/itm/${published.listingId}` };
}

/** Retire une annonce publiée par l'API (appelé quand l'article se vend ailleurs). */
export async function withdrawFromEbay(userId: string, listing: Listing, fetchImpl: Fetch = fetch): Promise<boolean> {
  if (listing.platform !== "ebay" || !listing.externalId || !ebayConfigured()) return false;
  const access = await accessToken(userId, fetchImpl);
  await call(fetchImpl, access, "POST", `/sell/inventory/v1/offer/${listing.externalId}/withdraw`);
  return true;
}
