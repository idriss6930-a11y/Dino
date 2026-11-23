/** Articles, photos, annonces par plateforme et ventes. Toutes les fonctions vérifient que l'article appartient à l'utilisateur. */
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { CONDITIONS, PLATFORM_IDS, type PlatformId } from "@/lib/db/schema";
import { aiConfigured, type DraftPhoto } from "@/lib/listing/claude";
import { generateListing } from "@/lib/listing/generate";
import { netProfitCents } from "@/lib/listing/profit";
import { fitTitle, normalizeHashtags } from "@/lib/listing/rules";
import type { ItemFacts } from "@/lib/listing/types";
import { log } from "@/lib/log";
import { newId, randomToken } from "@/lib/utils/ids";
import { NotFoundError, UserFacingError } from "./errors";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, sniffImage } from "./images";
import { consumeAiQuota, consumeItemQuota, type Plan } from "./plans";

type User = { id: string; plan: Plan };
const short = (max: number) => z.string().trim().max(max);
const cents = z.number().int().min(0).max(100_000_000).nullable();

export const factsSchema = z.object({
  kind: short(60).min(2, "Indiquez le type d'article (par exemple « veste en jean »)"),
  brand: short(60).default(""),
  size: short(30).default(""),
  color: short(40).default(""),
  material: short(60).default(""),
  audience: z.enum(["femme", "homme", "enfant", "mixte"]).default("mixte"),
  condition: z.enum(CONDITIONS).default("very_good"),
  defects: short(400).default(""),
  notes: short(600).default(""),
  purchaseCents: cents.default(null),
});

export const patchSchema = factsSchema.partial().extend({
  title: short(200).optional(),
  description: short(3000).optional(),
  hashtags: z.array(z.string().max(40)).max(20).optional(),
  priceCents: cents.optional(),
});

export type Item = typeof s.items.$inferSelect;
export type Listing = typeof s.listings.$inferSelect;

const factsOf = (i: Item): ItemFacts => ({ kind: i.kind, brand: i.brand, size: i.size, color: i.color, material: i.material, audience: i.audience, condition: i.condition, defects: i.defects, notes: i.notes });

async function own(userId: string, itemId: string): Promise<Item> {
  const db = await getDb();
  const [item] = await db.select().from(s.items).where(and(eq(s.items.id, itemId), eq(s.items.userId, userId))).limit(1);
  if (!item) throw new NotFoundError("Article introuvable");
  return item;
}

export async function createItem(user: User, raw: unknown): Promise<Item> {
  const input = factsSchema.parse(raw);
  await consumeItemQuota(user);
  const db = await getDb();
  const id = newId();
  await db.insert(s.items).values({ id, userId: user.id, ...input });
  return own(user.id, id);
}

export async function updateItem(userId: string, itemId: string, raw: unknown): Promise<Item> {
  const patch = patchSchema.parse(raw);
  const item = await own(userId, itemId);
  const textEdited = (patch.title !== undefined && patch.title !== item.title) || (patch.description !== undefined && patch.description !== item.description);
  const db = await getDb();
  await db
    .update(s.items)
    .set({
      ...patch,
      ...(patch.title !== undefined ? { title: fitTitle(patch.title, 200) } : {}),
      ...(patch.hashtags ? { hashtags: normalizeHashtags(patch.hashtags) } : {}),
      // Un texte retouché à la main n'est plus présenté comme « rédigé par l'IA ».
      ...(textEdited ? { writtenBy: "manual" as const } : {}),
      updatedAt: new Date(),
    })
    .where(eq(s.items.id, itemId));
  return own(userId, itemId);
}

export async function deleteItem(userId: string, itemId: string) {
  await own(userId, itemId);
  const db = await getDb();
  await db.delete(s.items).where(eq(s.items.id, itemId));
}

export async function getItem(userId: string, itemId: string) {
  const item = await own(userId, itemId);
  const db = await getDb();
  const listings = await db.select().from(s.listings).where(eq(s.listings.itemId, itemId));
  const photos = await db.select({ id: s.photos.id }).from(s.photos).where(eq(s.photos.itemId, itemId)).orderBy(asc(s.photos.position), asc(s.photos.createdAt));
  return { item, listings, photoIds: photos.map((p) => p.id) };
}

export async function listItems(userId: string) {
  const db = await getDb();
  const items = await db.select().from(s.items).where(eq(s.items.userId, userId)).orderBy(desc(s.items.createdAt)).limit(500);
  const listings = await db.select().from(s.listings).where(eq(s.listings.userId, userId));
  const photos = await db.select({ id: s.photos.id, itemId: s.photos.itemId }).from(s.photos).where(eq(s.photos.userId, userId)).orderBy(asc(s.photos.position), asc(s.photos.createdAt));
  return items.map((item) => ({
    item,
    listings: listings.filter((l) => l.itemId === item.id),
    coverId: photos.find((p) => p.itemId === item.id)?.id ?? null,
  }));
}

// ── Photos ──────────────────────────────────────────────────────────────────

export async function addPhoto(userId: string, itemId: string, bytes: Uint8Array): Promise<{ id: string }> {
  await own(userId, itemId);
  if (bytes.length > MAX_PHOTO_BYTES) throw new UserFacingError("Photo trop lourde (1,5 Mo au plus après réduction).");
  const mime = sniffImage(bytes);
  if (!mime) throw new UserFacingError("Format non reconnu : envoyez une photo JPEG, PNG ou WebP.");
  const db = await getDb();
  const existing = await db.select({ id: s.photos.id }).from(s.photos).where(eq(s.photos.itemId, itemId));
  if (existing.length >= MAX_PHOTOS) throw new UserFacingError(`${MAX_PHOTOS} photos au plus par article.`);
  const id = randomToken(24);
  await db.insert(s.photos).values({ id, itemId, userId, mime, dataB64: Buffer.from(bytes).toString("base64"), position: existing.length });
  return { id };
}

export async function deletePhoto(userId: string, photoId: string) {
  const db = await getDb();
  await db.delete(s.photos).where(and(eq(s.photos.id, photoId), eq(s.photos.userId, userId)));
}

/** Lecture publique par jeton non devinable (eBay doit pouvoir charger les photos). */
export async function readPhoto(photoId: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!/^[\w-]{20,64}$/.test(photoId)) return null;
  const db = await getDb();
  const [p] = await db.select().from(s.photos).where(eq(s.photos.id, photoId)).limit(1);
  return p ? { mime: p.mime, bytes: Buffer.from(p.dataB64, "base64") } : null;
}

// ── Rédaction ───────────────────────────────────────────────────────────────

export async function generateForItem(user: User, itemId: string, generate: typeof generateListing = generateListing) {
  const item = await own(user.id, itemId);
  const db = await getDb();
  let photos: DraftPhoto[] = [];
  if (aiConfigured()) {
    await consumeAiQuota(user);
    const rows = await db.select().from(s.photos).where(eq(s.photos.itemId, itemId)).orderBy(asc(s.photos.position)).limit(4);
    photos = rows.map((p) => ({ mime: p.mime as DraftPhoto["mime"], dataB64: p.dataB64 }));
  }
  const g = await generate(factsOf(item), photos);
  await db
    .update(s.items)
    .set({
      title: g.text.title,
      description: g.text.description,
      hashtags: g.text.hashtags,
      writtenBy: g.writtenBy,
      estimateLowCents: g.estimate?.lowCents ?? null,
      estimateHighCents: g.estimate?.highCents ?? null,
      estimateNote: g.estimateNote,
      updatedAt: new Date(),
    })
    .where(eq(s.items.id, itemId));
  return { item: await own(user.id, itemId), cautions: g.cautions, notice: g.notice };
}

// ── Annonces par plateforme ─────────────────────────────────────────────────

async function refreshStatus(itemId: string) {
  const db = await getDb();
  const [item] = await db.select().from(s.items).where(eq(s.items.id, itemId));
  if (!item || item.status === "sold" || item.status === "archived") return;
  const online = await db.select({ p: s.listings.platform }).from(s.listings).where(and(eq(s.listings.itemId, itemId), eq(s.listings.status, "online")));
  await db.update(s.items).set({ status: online.length ? "online" : "draft", updatedAt: new Date() }).where(eq(s.items.id, itemId));
}

export const listingSchema = z.object({ platform: z.enum(PLATFORM_IDS), status: z.enum(["online", "removed"]) });

/** Le vendeur indique qu'il a mis en ligne (ou retiré) l'annonce sur une plateforme. */
export async function setListing(userId: string, itemId: string, raw: unknown, api?: { externalId: string; externalUrl: string }) {
  const { platform, status } = listingSchema.parse(raw);
  const item = await own(userId, itemId);
  if (item.status === "sold" && status === "online") throw new UserFacingError("Cet article est vendu : annulez la vente avant de le remettre en ligne.");
  if (status === "online" && !item.title.trim()) throw new UserFacingError("Rédigez d'abord l'annonce.");
  const db = await getDb();
  const values = { status, via: api ? ("api" as const) : ("manual" as const), externalId: api?.externalId ?? null, externalUrl: api?.externalUrl ?? null, updatedAt: new Date() };
  await db
    .insert(s.listings)
    .values({ itemId, platform, userId, ...values })
    .onConflictDoUpdate({ target: [s.listings.itemId, s.listings.platform], set: api || status === "online" ? values : { status, updatedAt: new Date() } });
  await refreshStatus(itemId);
  return getItem(userId, itemId);
}

export const saleSchema = z.object({
  platform: z.enum([...PLATFORM_IDS, "other"]),
  soldCents: z.number().int().min(0).max(100_000_000),
  feesCents: z.number().int().min(0).max(100_000_000).default(0),
  shippingCents: z.number().int().min(0).max(100_000_000).default(0),
});

/** Retrait automatique sur les plateformes publiées par API ; les autres restent « à retirer » jusqu'à confirmation. */
export type Withdraw = (userId: string, listing: Listing) => Promise<boolean>;

export async function markSold(userId: string, itemId: string, raw: unknown, withdraw?: Withdraw) {
  const sale = saleSchema.parse(raw);
  const item = await own(userId, itemId);
  if (item.status === "sold") throw new UserFacingError("Cet article est déjà marqué comme vendu.");
  const db = await getDb();
  await db
    .update(s.items)
    .set({ status: "sold", soldPlatform: sale.platform, soldCents: sale.soldCents, soldFeesCents: sale.feesCents, soldShippingCents: sale.shippingCents, soldAt: new Date(), updatedAt: new Date() })
    .where(eq(s.items.id, itemId));
  if (sale.platform !== "other") {
    await db
      .insert(s.listings)
      .values({ itemId, platform: sale.platform, userId, status: "sold" })
      .onConflictDoUpdate({ target: [s.listings.itemId, s.listings.platform], set: { status: "sold", updatedAt: new Date() } });
  }
  const others = await db.select().from(s.listings).where(and(eq(s.listings.itemId, itemId), eq(s.listings.status, "online")));
  for (const l of others) {
    let removed = false;
    if (withdraw && l.via === "api") {
      try {
        removed = await withdraw(userId, l);
      } catch (e) {
        log.warn("withdraw_failed", { platform: l.platform, error: e instanceof Error ? e.message : String(e) });
      }
    }
    await db.update(s.listings).set({ status: removed ? "removed" : "to_remove", updatedAt: new Date() }).where(and(eq(s.listings.itemId, itemId), eq(s.listings.platform, l.platform)));
  }
  return getItem(userId, itemId);
}

/** Annule une vente saisie par erreur : les annonces « à retirer » ou « vendue » repassent en ligne. */
export async function cancelSale(userId: string, itemId: string) {
  const item = await own(userId, itemId);
  if (item.status !== "sold") throw new UserFacingError("Cet article n'est pas marqué comme vendu.");
  const db = await getDb();
  await db.update(s.items).set({ status: "draft", soldPlatform: null, soldCents: null, soldFeesCents: null, soldShippingCents: null, soldAt: null, updatedAt: new Date() }).where(eq(s.items.id, itemId));
  await db.update(s.listings).set({ status: "online", updatedAt: new Date() }).where(and(eq(s.listings.itemId, itemId), inArray(s.listings.status, ["to_remove", "sold"])));
  await refreshStatus(itemId);
  return getItem(userId, itemId);
}

// ── Tableau de bord ─────────────────────────────────────────────────────────

export async function dashboardStats(userId: string, now = new Date()) {
  const db = await getDb();
  const items = await db.select().from(s.items).where(and(eq(s.items.userId, userId), ne(s.items.status, "archived")));
  const [toRemove] = await db.select({ n: sql<number>`count(*)::int` }).from(s.listings).where(and(eq(s.listings.userId, userId), eq(s.listings.status, "to_remove")));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sold = items.filter((i) => i.status === "sold" && i.soldCents !== null);
  const profit = (list: Item[]) => list.reduce((sum, i) => sum + netProfitCents({ soldCents: i.soldCents!, feesCents: i.soldFeesCents, shippingCents: i.soldShippingCents, purchaseCents: i.purchaseCents }), 0);
  const soldThisMonth = sold.filter((i) => i.soldAt && i.soldAt >= monthStart);
  return {
    inStock: items.filter((i) => i.status !== "sold").length,
    online: items.filter((i) => i.status === "online").length,
    soldCount: sold.length,
    soldThisMonth: soldThisMonth.length,
    profitThisMonthCents: profit(soldThisMonth),
    profitTotalCents: profit(sold),
    /** Bénéfice calculé sans prix d'achat pour ces articles : le chiffre est donc surestimé. */
    soldWithoutPurchasePrice: sold.filter((i) => i.purchaseCents === null).length,
    toRemove: toRemove?.n ?? 0,
  };
}
