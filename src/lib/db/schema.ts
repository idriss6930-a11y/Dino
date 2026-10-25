/**
 * Schéma de données DINO (PostgreSQL, via Drizzle ORM).
 *
 * Conventions :
 * - identifiants texte (UUID v4 générés côté serveur) pour les entités utilisateur ;
 * - montants stockés en centimes entiers (`*_cents`) + devise ISO 4217 → pas d'erreurs d'arrondi ;
 * - `is_demo` marque toute donnée synthétique : elle ne doit JAMAIS être mélangée à des offres réelles ;
 * - les durées de conservation sont documentées dans docs/DATA_MODEL.md et appliquées par le worker.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Utilisateurs, sessions, sécurité                                    */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    handle: text("handle").notNull(),
    bio: text("bio").notNull().default(""),
    avatarColor: text("avatar_color").notNull().default("#7a9e7e"),
    role: text("role", { enum: ["user", "moderator", "admin"] }).notNull().default("user"),
    /** Préparation de la monétisation : les limites de fonctionnalités se lisent ici. */
    plan: text("plan", { enum: ["free", "premium"] }).notNull().default("free"),
    emailVerifiedAt: ts("email_verified_at"),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_handle_uq").on(t.handle)],
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

/** Tentatives de connexion (anti brute-force). Clé = hash(email) ou hash(ip). Conservation : 30 jours. */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
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

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  homeAirport: text("home_airport"),
  currency: text("currency").notNull().default("EUR"),
  locale: text("locale").notNull().default("fr"),
  typicalBudgetCents: integer("typical_budget_cents"),
  /** ex. ["plage","culture","nature"] — jamais de données sensibles. */
  travelStyles: jsonb("travel_styles").$type<string[]>().notNull().default([]),
  climateMinC: smallint("climate_min_c"),
  climateMaxC: smallint("climate_max_c"),
  personalizationEnabled: boolean("personalization_enabled").notNull().default(true),
  notifyInApp: boolean("notify_in_app").notNull().default(true),
  notifyEmail: boolean("notify_email").notNull().default(false),
  notifyPush: boolean("notify_push").notNull().default(false),
  /** Garde-fou anti-spam : nombre maximal de notifications d'alerte par jour. */
  maxAlertNotificationsPerDay: smallint("max_alert_notifications_per_day").notNull().default(5),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const privacySettings = pgTable("privacy_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  profileVisibility: text("profile_visibility", { enum: ["public", "friends", "private"] }).notNull().default("private"),
  mapVisibility: text("map_visibility", { enum: ["public", "friends", "private"] }).notNull().default("private"),
  showTrips: boolean("show_trips").notNull().default(false),
  storeSearchHistory: boolean("store_search_history").notNull().default(false),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Référentiel géographique                                            */
/* ------------------------------------------------------------------ */

export const countries = pgTable("countries", {
  iso2: text("iso2").primaryKey(),
  nameFr: text("name_fr").notNull(),
  nameEn: text("name_en").notNull(),
  continent: text("continent").notNull(),
  currency: text("currency"),
});

export const cities = pgTable(
  "cities",
  {
    slug: text("slug").primaryKey(),
    countryIso: text("country_iso").notNull().references(() => countries.iso2),
    nameFr: text("name_fr").notNull(),
    nameEn: text("name_en").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    timeZone: text("time_zone").notNull(),
  },
  (t) => [index("cities_country_idx").on(t.countryIso)],
);

export const airports = pgTable(
  "airports",
  {
    iata: text("iata").primaryKey(),
    name: text("name").notNull(),
    cityName: text("city_name").notNull(),
    countryIso: text("country_iso").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    size: text("size", { enum: ["L", "M"] }).notNull(),
  },
  (t) => [index("airports_country_idx").on(t.countryIso)],
);

export const destinations = pgTable(
  "destinations",
  {
    slug: text("slug").primaryKey(),
    citySlug: text("city_slug").references(() => cities.slug),
    countryIso: text("country_iso").notNull().references(() => countries.iso2),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    dataVersion: text("data_version").notNull(),
  },
  (t) => [index("destinations_country_idx").on(t.countryIso)],
);

/* ------------------------------------------------------------------ */
/* Sources de données et suivi des coûts API                          */
/* ------------------------------------------------------------------ */

export const dataSources = pgTable("data_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  license: text("license").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  lastSuccessAt: ts("last_success_at"),
  lastErrorAt: ts("last_error_at"),
  /** Message d'erreur nettoyé (jamais de clé ni d'URL signée). */
  lastError: text("last_error"),
});

export const apiUsage = pgTable(
  "api_usage",
  {
    sourceId: text("source_id").notNull().references(() => dataSources.id),
    day: date("day").notNull(),
    requests: integer("requests").notNull().default(0),
    errors: integer("errors").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sourceId, t.day] })],
);

/** Cache des réponses fournisseurs normalisées. TTL selon la licence de chaque source. */
export const cacheEntries = pgTable(
  "cache_entries",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("cache_expires_idx").on(t.expiresAt)],
);

/* ------------------------------------------------------------------ */
/* Offres, établissements, historique des prix                         */
/* ------------------------------------------------------------------ */

export const flightOffers = pgTable(
  "flight_offers",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull().references(() => dataSources.id),
    externalId: text("external_id").notNull(),
    /** Clé de comparabilité : itinéraire + dates + voyageurs + classe. */
    comparableKey: text("comparable_key").notNull(),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    departDate: date("depart_date").notNull(),
    returnDate: date("return_date"),
    cabin: text("cabin").notNull(),
    passengers: smallint("passengers").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull(),
    payload: jsonb("payload").notNull(),
    isDemo: boolean("is_demo").notNull(),
    fetchedAt: ts("fetched_at").notNull(),
    expiresAt: ts("expires_at"),
  },
  (t) => [
    index("flight_offers_key_idx").on(t.comparableKey, t.fetchedAt),
    uniqueIndex("flight_offers_src_ext_uq").on(t.sourceId, t.externalId, t.fetchedAt),
  ],
);

/** Établissement canonique (un hôtel réel), rapproché entre fournisseurs. */
export const properties = pgTable(
  "properties",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    citySlug: text("city_slug"),
    countryIso: text("country_iso"),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    stars: real("stars"),
    address: text("address"),
    isDemo: boolean("is_demo").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("properties_city_idx").on(t.citySlug), index("properties_name_idx").on(t.normalizedName)],
);

export const propertySourceRefs = pgTable(
  "property_source_refs",
  {
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => dataSources.id),
    externalId: text("external_id").notNull(),
    matchConfidence: real("match_confidence").notNull(),
  },
  (t) => [primaryKey({ columns: [t.sourceId, t.externalId] }), index("psr_property_idx").on(t.propertyId)],
);

export const hotelOffers = pgTable(
  "hotel_offers",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => dataSources.id),
    comparableKey: text("comparable_key").notNull(),
    checkin: date("checkin").notNull(),
    checkout: date("checkout").notNull(),
    adults: smallint("adults").notNull(),
    rooms: smallint("rooms").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull(),
    payload: jsonb("payload").notNull(),
    isDemo: boolean("is_demo").notNull(),
    fetchedAt: ts("fetched_at").notNull(),
  },
  (t) => [index("hotel_offers_key_idx").on(t.comparableKey, t.fetchedAt), index("hotel_offers_prop_idx").on(t.propertyId)],
);

/**
 * Historique tarifaire réellement observé (une ligne par observation).
 * `route_key` identifie un produit comparable (ex. "PAR-LIS|2027-03-12|2027-03-19|economy|1").
 * Les observations de démonstration ont `is_demo = true` et ne servent qu'aux offres de démonstration.
 */
export const priceObservations = pgTable(
  "price_observations",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["flight", "hotel"] }).notNull(),
    routeKey: text("route_key").notNull(),
    /** Clé « itinéraire seul » pour les tendances saisonnières (ex. "PAR-LIS|economy"). */
    marketKey: text("market_key").notNull(),
    travelDate: date("travel_date").notNull(),
    observedAt: ts("observed_at").notNull(),
    leadDays: integer("lead_days").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull(),
    priceEurCents: integer("price_eur_cents").notNull(),
    sourceId: text("source_id").notNull().references(() => dataSources.id),
    isDemo: boolean("is_demo").notNull(),
  },
  (t) => [
    index("price_obs_route_idx").on(t.routeKey, t.observedAt),
    index("price_obs_market_idx").on(t.marketKey, t.travelDate),
  ],
);

export const climateNormals = pgTable(
  "climate_normals",
  {
    destinationSlug: text("destination_slug").notNull().references(() => destinations.slug, { onDelete: "cascade" }),
    month: smallint("month").notNull(),
    tmaxC: real("tmax_c").notNull(),
    tminC: real("tmin_c").notNull(),
    precipMm: real("precip_mm").notNull(),
    sourceId: text("source_id").notNull().references(() => dataSources.id),
    period: text("period").notNull(),
    fetchedAt: ts("fetched_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.destinationSlug, t.month, t.sourceId] }), check("month_range", sql`${t.month} between 1 and 12`)],
);

/* ------------------------------------------------------------------ */
/* Alertes et notifications                                            */
/* ------------------------------------------------------------------ */

export type AlertCriteria = {
  origin?: string;
  destination?: string; // IATA, slug ou "anywhere"
  departDate?: string;
  returnDate?: string;
  departMonth?: string; // YYYY-MM pour les dates flexibles
  tripNights?: number;
  passengers?: number;
  cabin?: "economy" | "premium_economy" | "business" | "first";
  citySlug?: string; // alertes hôtel / zone
  checkin?: string;
  checkout?: string;
  maxStops?: number;
  tags?: string[];
  propertyName?: string;
  budget?: number;
  nights?: number;
};

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["route", "flexible", "hotel", "budget", "deal"] }).notNull(),
    name: text("name").notNull(),
    criteria: jsonb("criteria").$type<AlertCriteria>().notNull(),
    maxPriceCents: integer("max_price_cents"),
    dropPct: smallint("drop_pct"),
    currency: text("currency").notNull().default("EUR"),
    /** Fréquence de vérification réellement appliquée (bornée par la source et l'offre). */
    checkEveryMinutes: integer("check_every_minutes").notNull().default(360),
    channels: jsonb("channels").$type<{ inApp: boolean; email: boolean; push: boolean }>().notNull(),
    active: boolean("active").notNull().default(true),
    referencePriceCents: integer("reference_price_cents"),
    lastPriceCents: integer("last_price_cents"),
    lastCheckedAt: ts("last_checked_at"),
    lastNotifiedAt: ts("last_notified_at"),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (t) => [index("alerts_user_idx").on(t.userId), index("alerts_due_idx").on(t.active, t.lastCheckedAt)],
);

/** Une variation de prix constatée. L'unicité (alert_id, fingerprint) empêche les doublons. */
export const alertEvents = pgTable(
  "alert_events",
  {
    id: text("id").primaryKey(),
    alertId: text("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    priceCents: integer("price_cents").notNull(),
    previousPriceCents: integer("previous_price_cents"),
    changePct: real("change_pct"),
    reason: text("reason").notNull(),
    offer: jsonb("offer").notNull(),
    isDemo: boolean("is_demo").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("alert_events_fp_uq").on(t.alertId, t.fingerprint)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    alertEventId: text("alert_event_id").references(() => alertEvents.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    mascot: text("mascot").notNull().default("happy"),
    delivery: jsonb("delivery").$type<Record<string, string>>().notNull().default({}),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("push_endpoint_uq").on(t.endpoint)],
);

/* ------------------------------------------------------------------ */
/* Espace personnel                                                    */
/* ------------------------------------------------------------------ */

export const trips = pgTable(
  "trips",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    destinationSlug: text("destination_slug").references(() => destinations.slug),
    startDate: date("start_date"),
    endDate: date("end_date"),
    budgetCents: integer("budget_cents"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("trips_user_idx").on(t.userId)],
);

/** Pays / villes visités ou souhaités (carte « Mon monde »). Jamais de coordonnées GPS précises. */
export const visitedPlaces = pgTable(
  "visited_places",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    countryIso: text("country_iso").notNull(),
    cityName: text("city_name").notNull().default(""),
    status: text("status", { enum: ["visited", "wishlist"] }).notNull(),
    visitedFrom: date("visited_from"),
    visitedTo: date("visited_to"),
    memory: text("memory").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("visited_uq").on(t.userId, t.countryIso, t.cityName, t.status)],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    destinationSlug: text("destination_slug").notNull().references(() => destinations.slug),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("wishlist_uq").on(t.userId, t.destinationSlug)],
);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["flight", "hotel"] }).notNull(),
    label: text("label").notNull(),
    params: jsonb("params").$type<Record<string, string>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId)],
);

/** Historique des recherches : stocké uniquement si l'utilisateur l'a activé. Conservation : 90 jours. */
export const searchHistory = pgTable(
  "search_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    params: jsonb("params").$type<Record<string, string>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("search_history_user_idx").on(t.userId, t.createdAt)],
);

/** Signaux d'intérêt pour les recommandations (si personnalisation activée). Conservation : 180 jours. */
export const interactions = pgTable(
  "interactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    destinationSlug: text("destination_slug").notNull(),
    kind: text("kind", { enum: ["view", "save", "search", "like", "dismiss"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("interactions_user_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Communauté                                                          */
/* ------------------------------------------------------------------ */

export const TIP_CATEGORIES = [
  "pratique",
  "economies",
  "itineraire",
  "restaurants",
  "lieux-secrets",
  "transports",
  "erreurs",
  "quartiers",
  "hebergement",
  "saison",
] as const;

export const tips = pgTable(
  "tips",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    destinationSlug: text("destination_slug").notNull().references(() => destinations.slug),
    countryIso: text("country_iso").notNull(),
    category: text("category", { enum: TIP_CATEGORIES }).notNull(),
    /** experience = vécu personnel ; verified = revérifié récemment ; official = source officielle ; sponsored = contenu payé déclaré. */
    kind: text("kind", { enum: ["experience", "verified", "official", "sponsored"] }).notNull().default("experience"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sponsorName: text("sponsor_name"),
    sourceUrl: text("source_url"),
    status: text("status", { enum: ["published", "pending", "hidden"] }).notNull().default("published"),
    moderationNote: text("moderation_note"),
    contentHash: text("content_hash").notNull(),
    verifiedAt: ts("verified_at"),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("tips_dest_idx").on(t.destinationSlug, t.status),
    index("tips_author_idx").on(t.authorId),
    index("tips_hash_idx").on(t.contentHash),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    tipId: text("tip_id").notNull().references(() => tips.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status", { enum: ["published", "hidden"] }).notNull().default("published"),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("comments_tip_idx").on(t.tipId, t.createdAt)],
);

export const tipLikes = pgTable(
  "tip_likes",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tipId: text("tip_id").notNull().references(() => tips.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tipId] })],
);

export const tipSaves = pgTable(
  "tip_saves",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tipId: text("tip_id").notNull().references(() => tips.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tipId] })],
);

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followeeId: text("followee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followeeId] }), check("no_self_follow", sql`${t.followerId} <> ${t.followeeId}`)],
);

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["tip", "comment"] }).notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason", { enum: ["spam", "fraude", "dangereux", "faux-avis", "sponsorise-non-declare", "offensant", "autre"] }).notNull(),
    details: text("details").notNull().default(""),
    status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
    resolvedBy: text("resolved_by"),
    resolvedAt: ts("resolved_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reports_uq").on(t.reporterId, t.targetType, t.targetId), index("reports_status_idx").on(t.status)],
);
