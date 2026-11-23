/**
 * Schéma de données Placard (PostgreSQL, via Drizzle ORM).
 * Conventions : identifiants texte générés côté serveur ; montants en centimes entiers, en euros.
 */
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

import { CONDITIONS, PLATFORM_IDS } from "../listing/constants";
export { CONDITIONS, PLATFORM_IDS, type Condition, type PlatformId } from "../listing/constants";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    plan: text("plan", { enum: ["free", "premium"] }).notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), index("users_stripe_customer_idx").on(t.stripeCustomerId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 du jeton : le jeton brut n'est jamais stocké. */
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: createdAt(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/** Tentatives de connexion (anti brute-force). Clé = hash(email) ou hash(ip). */
export const loginAttempts = pgTable(
  "login_attempts",
  { id: text("id").primaryKey(), key: text("key").notNull(), success: boolean("success").notNull(), createdAt: createdAt() },
  (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("password_resets_token_uq").on(t.tokenHash)],
);

/** Un article physique que le vendeur a en main. L'annonce (titre, description…) est commune aux plateformes. */
export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default(""),
    brand: text("brand").notNull().default(""),
    size: text("size").notNull().default(""),
    color: text("color").notNull().default(""),
    material: text("material").notNull().default(""),
    audience: text("audience", { enum: ["femme", "homme", "enfant", "mixte"] }).notNull().default("mixte"),
    condition: text("condition", { enum: CONDITIONS }).notNull().default("very_good"),
    defects: text("defects").notNull().default(""),
    notes: text("notes").notNull().default(""),
    purchaseCents: integer("purchase_cents"),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    hashtags: jsonb("hashtags").$type<string[]>().notNull().default([]),
    priceCents: integer("price_cents"),
    /** Origine du texte actuel : saisi à la main, règles automatiques, ou Claude. */
    writtenBy: text("written_by", { enum: ["manual", "rules", "claude"] }).notNull().default("manual"),
    /** Fourchette estimée par l'IA, affichée comme estimation. Null sans IA. */
    estimateLowCents: integer("estimate_low_cents"),
    estimateHighCents: integer("estimate_high_cents"),
    estimateNote: text("estimate_note").notNull().default(""),
    status: text("status", { enum: ["draft", "online", "sold", "archived"] }).notNull().default("draft"),
    soldPlatform: text("sold_platform", { enum: [...PLATFORM_IDS, "other"] }),
    soldCents: integer("sold_cents"),
    soldFeesCents: integer("sold_fees_cents"),
    soldShippingCents: integer("sold_shipping_cents"),
    soldAt: ts("sold_at"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("items_user_idx").on(t.userId, t.createdAt)],
);

/** Présence d'un article sur une plateforme. */
export const listings = pgTable(
  "listings",
  {
    itemId: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: PLATFORM_IDS }).notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** online : en vente ; to_remove : vendu ailleurs, à retirer ; removed : retiré ; sold : vendu ici. */
    status: text("status", { enum: ["online", "to_remove", "removed", "sold"] }).notNull(),
    via: text("via", { enum: ["manual", "api"] }).notNull().default("manual"),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.platform] }), index("listings_user_idx").on(t.userId, t.status)],
);

/** Photos stockées en base (base64) ; l'identifiant est un jeton non devinable qui sert d'adresse publique. */
export const photos = pgTable(
  "photos",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    mime: text("mime").notNull(),
    dataB64: text("data_b64").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("photos_item_idx").on(t.itemId, t.position)],
);

/** Compteurs mensuels (mois au format AAAA-MM) : un article supprimé reste compté dans le quota. */
export const usage = pgTable(
  "usage",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    itemsCreated: integer("items_created").notNull().default(0),
    aiGenerations: integer("ai_generations").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.month] })],
);

/** Jetons eBay du vendeur, chiffrés (AES-256-GCM, clé dérivée de APP_SECRET). */
export const ebayAccounts = pgTable("ebay_accounts", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  refreshExpiresAt: ts("refresh_expires_at"),
  connectedAt: ts("connected_at").notNull().defaultNow(),
});

/** Événements Stripe déjà traités (un webhook peut être livré plusieurs fois). */
export const stripeEvents = pgTable("stripe_events", { id: text("id").primaryKey(), type: text("type").notNull(), createdAt: createdAt() });
