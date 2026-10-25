/**
 * Espace personnel : préférences, confidentialité, « Mon monde » (pays visités / souhaités), liste de souhaits,
 * voyages et recherches enregistrées. Toutes les fonctions prennent l'identifiant de l'utilisateur connecté :
 * impossible de lire ou modifier les données d'un autre compte.
 */
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import geo from "@/data/geo/countries.geo.json";
import { COUNTRIES } from "@/data/countries";
import { getDestination } from "@/data/destinations";
import { TAGS, type Tag } from "@/data/types";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { isIsoDate } from "@/lib/utils/dates";
import { newId } from "@/lib/utils/ids";
import { zBool } from "@/lib/utils/zod";
import { ForbiddenError, NotFoundError, UserFacingError } from "./errors";
import { publicProfile } from "./community";
import type { SessionUser } from "./auth";

type GeoProps = { iso: string; name: string; name_fr: string | null; continent: string };
const GEO = (geo as { features: { properties: GeoProps }[] }).features.map((f) => f.properties);
const continentOf = (iso: string) => {
  const g = GEO.find((x) => x.iso === iso);
  return g?.continent ?? (COUNTRIES[iso]?.continent === "Afrique" ? "Africa" : "Other");
};
export const countryName = (iso: string) => COUNTRIES[iso]?.fr ?? GEO.find((x) => x.iso === iso)?.name_fr ?? GEO.find((x) => x.iso === iso)?.name ?? iso;

/* ------------------------------- Préférences ------------------------------- */

export const prefsSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  bio: z.string().max(400).optional(),
  homeAirport: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  typicalBudget: z.coerce.number().min(0).max(100000).nullable().optional(),
  travelStyles: z.array(z.enum(Object.keys(TAGS) as [Tag, ...Tag[]])).max(8).optional(),
  climateMinC: z.coerce.number().int().min(-30).max(45).nullable().optional(),
  climateMaxC: z.coerce.number().int().min(-30).max(50).nullable().optional(),
  personalizationEnabled: zBool(true).optional(),
  notifyInApp: zBool(true).optional(),
  notifyEmail: zBool().optional(),
  notifyPush: zBool().optional(),
  maxAlertNotificationsPerDay: z.coerce.number().int().min(1).max(20).optional(),
  profileVisibility: z.enum(["public", "friends", "private"]).optional(),
  mapVisibility: z.enum(["public", "friends", "private"]).optional(),
  showTrips: zBool().optional(),
  storeSearchHistory: zBool().optional(),
});

export async function getMe(userId: string) {
  const db = await getDb();
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
  const [p] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  const [v] = await db.select().from(s.privacySettings).where(eq(s.privacySettings.userId, userId));
  if (!u) throw new NotFoundError();
  return {
    user: { id: u.id, email: u.email, displayName: u.displayName, handle: u.handle, bio: u.bio, avatarColor: u.avatarColor, plan: u.plan, role: u.role, createdAt: u.createdAt },
    prefs: p,
    privacy: v,
  };
}

export async function updatePrefs(userId: string, raw: unknown) {
  const x = prefsSchema.parse(raw);
  const db = await getDb();
  if (x.displayName !== undefined || x.bio !== undefined)
    await db.update(s.users).set({ ...(x.displayName ? { displayName: x.displayName } : {}), ...(x.bio !== undefined ? { bio: x.bio } : {}), updatedAt: new Date() }).where(eq(s.users.id, userId));
  const prefPatch: Partial<typeof s.userPreferences.$inferInsert> = {};
  if (x.homeAirport !== undefined) prefPatch.homeAirport = x.homeAirport;
  if (x.currency) prefPatch.currency = x.currency;
  if (x.typicalBudget !== undefined) prefPatch.typicalBudgetCents = x.typicalBudget == null ? null : Math.round(x.typicalBudget * 100);
  if (x.travelStyles) prefPatch.travelStyles = x.travelStyles;
  if (x.climateMinC !== undefined) prefPatch.climateMinC = x.climateMinC;
  if (x.climateMaxC !== undefined) prefPatch.climateMaxC = x.climateMaxC;
  for (const k of ["personalizationEnabled", "notifyInApp", "notifyEmail", "notifyPush", "maxAlertNotificationsPerDay"] as const) if (x[k] !== undefined) (prefPatch as Record<string, unknown>)[k] = x[k];
  if (Object.keys(prefPatch).length) await db.update(s.userPreferences).set({ ...prefPatch, updatedAt: new Date() }).where(eq(s.userPreferences.userId, userId));
  const privPatch: Partial<typeof s.privacySettings.$inferInsert> = {};
  for (const k of ["profileVisibility", "mapVisibility", "showTrips", "storeSearchHistory"] as const) if (x[k] !== undefined) (privPatch as Record<string, unknown>)[k] = x[k];
  if (Object.keys(privPatch).length) await db.update(s.privacySettings).set({ ...privPatch, updatedAt: new Date() }).where(eq(s.privacySettings.userId, userId));
  if (x.personalizationEnabled === false) await db.delete(s.interactions).where(eq(s.interactions.userId, userId)); // désactiver = oublier
  if (x.storeSearchHistory === false) await db.delete(s.searchHistory).where(eq(s.searchHistory.userId, userId));
}

/* -------------------------------- Mon monde -------------------------------- */

export const placeSchema = z.object({
  countryIso: z.string().trim().toUpperCase().min(2).max(3).refine((iso) => GEO.some((g) => g.iso === iso) || !!COUNTRIES[iso], "Pays inconnu"),
  cityName: z.string().trim().max(80).default(""),
  status: z.enum(["visited", "wishlist"]),
  visitedFrom: z.string().refine(isIsoDate).nullable().optional(),
  visitedTo: z.string().refine(isIsoDate).nullable().optional(),
  memory: z.string().max(2000).default(""),
});

export async function upsertPlace(userId: string, raw: unknown) {
  const p = placeSchema.parse(raw);
  if (p.visitedFrom && p.visitedTo && p.visitedTo < p.visitedFrom) throw new UserFacingError("La date de fin précède la date de début");
  const db = await getDb();
  await db
    .insert(s.visitedPlaces)
    .values({ id: newId(), userId, ...p, visitedFrom: p.visitedFrom ?? null, visitedTo: p.visitedTo ?? null })
    .onConflictDoUpdate({ target: [s.visitedPlaces.userId, s.visitedPlaces.countryIso, s.visitedPlaces.cityName, s.visitedPlaces.status], set: { visitedFrom: p.visitedFrom ?? null, visitedTo: p.visitedTo ?? null, memory: p.memory } });
  // Un pays visité n'est plus « souhaité ».
  if (p.status === "visited" && !p.cityName)
    await db.delete(s.visitedPlaces).where(and(eq(s.visitedPlaces.userId, userId), eq(s.visitedPlaces.countryIso, p.countryIso), eq(s.visitedPlaces.status, "wishlist"), eq(s.visitedPlaces.cityName, "")));
}

export async function removePlace(userId: string, placeId: string) {
  const db = await getDb();
  const [p] = await db.select({ userId: s.visitedPlaces.userId }).from(s.visitedPlaces).where(eq(s.visitedPlaces.id, placeId));
  if (!p) throw new NotFoundError();
  if (p.userId !== userId) throw new ForbiddenError();
  await db.delete(s.visitedPlaces).where(eq(s.visitedPlaces.id, placeId));
}

export function worldStats(places: { countryIso: string; cityName: string; status: string }[]) {
  const visited = places.filter((p) => p.status === "visited");
  const countries = new Set(visited.map((p) => p.countryIso));
  const continents = new Set([...countries].map(continentOf).filter((c) => !["Other", "Seven seas (open ocean)", "Antarctica"].includes(c)));
  const cities = new Set(visited.filter((p) => p.cityName).map((p) => `${p.countryIso}:${p.cityName.toLowerCase()}`));
  const wish = new Set(places.filter((p) => p.status === "wishlist").map((p) => p.countryIso));
  const wishDone = [...wish].filter((c) => countries.has(c)).length;
  return {
    countries: countries.size,
    continents: continents.size,
    cities: cities.size,
    worldPct: Math.round((countries.size / 195) * 1000) / 10,
    wishlistCountries: wish.size,
    goalProgress: wish.size + wishDone ? Math.round((wishDone / (wish.size + wishDone)) * 100) : 0,
    continentList: [...continents],
  };
}

export async function getWorld(userId: string) {
  const db = await getDb();
  const places = await db.select().from(s.visitedPlaces).where(eq(s.visitedPlaces.userId, userId)).orderBy(desc(s.visitedPlaces.createdAt));
  return { places: places.map((p) => ({ ...p, countryName: countryName(p.countryIso) })), stats: worldStats(places) };
}

/** Carte d'un autre voyageur, uniquement si sa visibilité le permet (privée par défaut). Jamais de souvenirs ni de dates. */
export async function getPublicWorld(handle: string, viewer: SessionUser | null) {
  const prof = await publicProfile(handle, viewer);
  if (!prof.canSeeMap) return { profile: prof, visible: false as const };
  const db = await getDb();
  const places = await db.select({ countryIso: s.visitedPlaces.countryIso, cityName: s.visitedPlaces.cityName, status: s.visitedPlaces.status }).from(s.visitedPlaces).where(eq(s.visitedPlaces.userId, prof.userId));
  return { profile: prof, visible: true as const, places: places.map((p) => ({ countryIso: p.countryIso, status: p.status })), stats: worldStats(places) };
}

/* ----------------------- Souhaits, voyages, recherches ----------------------- */

export async function toggleWishlist(userId: string, slug: string) {
  if (!getDestination(slug)) throw new NotFoundError("Destination inconnue");
  const db = await getDb();
  const del = await db.delete(s.wishlistItems).where(and(eq(s.wishlistItems.userId, userId), eq(s.wishlistItems.destinationSlug, slug))).returning();
  if (del.length) return { saved: false };
  await db.insert(s.wishlistItems).values({ id: newId(), userId, destinationSlug: slug });
  await recordInteraction(userId, slug, "save");
  return { saved: true };
}

export async function listWishlist(userId: string) {
  const db = await getDb();
  return db.select().from(s.wishlistItems).where(eq(s.wishlistItems.userId, userId)).orderBy(desc(s.wishlistItems.createdAt));
}

export const tripSchema = z.object({
  title: z.string().trim().min(2).max(100),
  destinationSlug: z.string().refine((x) => !!getDestination(x)).nullable().optional(),
  startDate: z.string().refine(isIsoDate).nullable().optional(),
  endDate: z.string().refine(isIsoDate).nullable().optional(),
  budget: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  notes: z.string().max(4000).default(""),
});

export async function createTrip(userId: string, raw: unknown) {
  const t = tripSchema.parse(raw);
  if (t.startDate && t.endDate && t.endDate < t.startDate) throw new UserFacingError("La date de fin précède la date de début");
  const db = await getDb();
  const id = newId();
  await db.insert(s.trips).values({ id, userId, title: t.title, destinationSlug: t.destinationSlug ?? null, startDate: t.startDate ?? null, endDate: t.endDate ?? null, budgetCents: t.budget == null ? null : Math.round(t.budget * 100), notes: t.notes });
  return { id };
}

export async function listTrips(userId: string) {
  const db = await getDb();
  return db.select().from(s.trips).where(eq(s.trips.userId, userId)).orderBy(desc(s.trips.startDate));
}

export async function deleteTrip(userId: string, id: string) {
  const db = await getDb();
  const [t] = await db.select({ userId: s.trips.userId }).from(s.trips).where(eq(s.trips.id, id));
  if (!t) throw new NotFoundError();
  if (t.userId !== userId) throw new ForbiddenError();
  await db.delete(s.trips).where(eq(s.trips.id, id));
}

export const savedSearchSchema = z.object({ kind: z.enum(["flight", "hotel"]), label: z.string().trim().min(2).max(100), params: z.record(z.string(), z.string().max(200)) });

export async function saveSearch(userId: string, raw: unknown) {
  const x = savedSearchSchema.parse(raw);
  const db = await getDb();
  const id = newId();
  await db.insert(s.savedSearches).values({ id, userId, ...x });
  return { id };
}

export async function listSavedSearches(userId: string) {
  const db = await getDb();
  return db.select().from(s.savedSearches).where(eq(s.savedSearches.userId, userId)).orderBy(desc(s.savedSearches.createdAt)).limit(30);
}

export async function deleteSavedSearch(userId: string, id: string) {
  const db = await getDb();
  const [x] = await db.select({ userId: s.savedSearches.userId }).from(s.savedSearches).where(eq(s.savedSearches.id, id));
  if (!x) throw new NotFoundError();
  if (x.userId !== userId) throw new ForbiddenError();
  await db.delete(s.savedSearches).where(eq(s.savedSearches.id, id));
}

/** Signal d'intérêt pour les recommandations — ignoré si l'utilisateur a désactivé la personnalisation. */
export async function recordInteraction(userId: string, slug: string, kind: "view" | "save" | "search" | "like" | "dismiss") {
  const db = await getDb();
  const [p] = await db.select({ on: s.userPreferences.personalizationEnabled }).from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  if (!p?.on) return;
  await db.insert(s.interactions).values({ id: newId(), userId, destinationSlug: slug, kind });
}

export async function recordSearch(userId: string, kind: string, params: Record<string, string>) {
  const db = await getDb();
  const [v] = await db.select({ on: s.privacySettings.storeSearchHistory }).from(s.privacySettings).where(eq(s.privacySettings.userId, userId));
  if (!v?.on) return;
  await db.insert(s.searchHistory).values({ id: newId(), userId, kind, params });
}
