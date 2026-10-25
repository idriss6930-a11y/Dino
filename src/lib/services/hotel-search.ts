/**
 * Comparateur d'hébergements.
 * Règle de comparabilité : toutes les offres d'une réponse partagent les mêmes dates, la même occupation et la même
 * devise d'affichage (comparableKey identique). Le rapprochement multi-sources ne fusionne deux fiches que si le
 * nom ET la position concordent : en cas de doute, les établissements restent séparés.
 */
import { z } from "zod";
import { zBool } from "@/lib/utils/zod";
import { getDestination } from "@/data/destinations";
import { convertCents, getFxTable, type FxTable } from "@/lib/providers/fx";
import { hotelDataMode, hotelProviders } from "@/lib/providers/registry";
import type { HotelOffer, HotelSearchParams, ProviderRunStatus } from "@/lib/providers/types";
import { daysBetween, isIsoDate, todayIn } from "@/lib/utils/dates";
import { haversineKm } from "@/lib/utils/geo";
import { runProviders } from "./run-providers";
import { UserFacingError } from "./flight-search";

const isoDate = z.string().refine(isIsoDate, "date invalide");

export const hotelQuerySchema = z
  .object({
    city: z.string().min(2).max(60),
    checkin: isoDate,
    checkout: isoDate,
    adults: z.coerce.number().int().min(1).max(12).default(2),
    rooms: z.coerce.number().int().min(1).max(6).default(1),
    currency: z.string().regex(/^[A-Z]{3}$/).default("EUR"),
    maxPerNight: z.coerce.number().positive().optional(),
    minStars: z.coerce.number().min(0).max(5).optional(),
    minRating: z.coerce.number().min(0).max(10).optional(),
    types: z.array(z.enum(["hotel", "hostel", "apartment", "guesthouse"])).optional(),
    amenities: z.array(z.string()).optional(),
    neighborhood: z.string().max(60).optional(),
    breakfast: zBool(false),
    refundable: zBool(false),
    maxDistanceKm: z.coerce.number().positive().max(50).optional(),
    sort: z.enum(["value", "price", "rating", "distance"]).default("value"),
  })
  .superRefine((q, ctx) => {
    if (isIsoDate(q.checkin) && isIsoDate(q.checkout)) {
      const n = daysBetween(q.checkin, q.checkout);
      if (n < 1) ctx.addIssue({ code: "custom", message: "Le départ doit être après l'arrivée", path: ["checkout"] });
      if (n > 30) ctx.addIssue({ code: "custom", message: "30 nuits maximum par recherche", path: ["checkout"] });
    }
    if (q.adults < q.rooms) ctx.addIssue({ code: "custom", message: "Au moins un adulte par chambre", path: ["rooms"] });
  });
export type HotelQuery = z.infer<typeof hotelQuerySchema>;

export type RankedHotelOffer = HotelOffer & { valueScore: number | null; valueExplanation: string };

/* ----------------------------- Rapprochement ----------------------------- */

const STOP = new Set(["hotel", "hôtel", "the", "le", "la", "les", "de", "du", "des", "and", "et", "&", "by", "spa", "resort"]);
export function normalizeName(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

export function nameSimilarity(a: string, b: string): number {
  const A = new Set(normalizeName(a));
  const B = new Set(normalizeName(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Même établissement si noms très proches ET positions à moins de 150 m. */
export function isSameProperty(a: HotelOffer["property"], b: HotelOffer["property"]): boolean {
  const meters = haversineKm(a.lat, a.lon, b.lat, b.lon) * 1000;
  return meters <= 150 && nameSimilarity(a.name, b.name) >= 0.6;
}

export function mergeHotelOffers(offers: HotelOffer[]): HotelOffer[] {
  const groups: HotelOffer[][] = [];
  for (const o of offers) {
    const g = groups.find((grp) => grp[0].source.id !== o.source.id && grp.every((x) => x.source.id !== o.source.id) && isSameProperty(grp[0].property, o.property));
    if (g) g.push(o);
    else groups.push([o]);
  }
  return groups.map((g) => {
    const sorted = [...g].sort((a, b) => a.price.estimatedTotalCents - b.price.estimatedTotalCents);
    const [best, ...others] = sorted;
    return others.length
      ? { ...best, alsoFrom: others.map((x) => ({ source: x.source, totalCents: x.price.estimatedTotalCents, currency: x.price.currency })) }
      : best;
  });
}

function normalizeHotelCurrency(offers: HotelOffer[], currency: string, fx: FxTable): HotelOffer[] {
  return offers.map((o) => {
    if (o.price.currency === currency) return o;
    const c = (v: number) => convertCents(v, o.price.currency, currency, fx);
    return {
      ...o,
      price: {
        ...o.price,
        currency,
        totalCents: c(o.price.totalCents),
        perNightCents: c(o.price.perNightCents),
        payAtPropertyCents: c(o.price.payAtPropertyCents),
        estimatedTotalCents: c(o.price.estimatedTotalCents),
        lines: o.price.lines.map((l) => ({ ...l, cents: c(l.cents) })),
      },
    };
  });
}

/* ------------------------------ Rapport qualité-prix ------------------------------ */

export function rankValue(offers: HotelOffer[]): RankedHotelOffer[] {
  const prices = offers.map((o) => o.price.estimatedTotalCents).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 1;
  return offers.map((o) => {
    const r = o.property.rating;
    if (!r || r.count < 10) {
      return { ...o, valueScore: null, valueExplanation: "Pas assez d'avis fournis par la source pour estimer le rapport qualité-prix." };
    }
    const quality = (r.score / r.scale) * 10; // sur 10
    const reliability = Math.min(1, Math.log10(r.count) / 3); // 1000 avis = fiabilité maximale
    const adjQuality = 7 + (quality - 7) * reliability; // ramène vers 7 si peu d'avis
    const priceRatio = o.price.estimatedTotalCents / median;
    const score = Math.round(Math.max(0, Math.min(10, adjQuality + (1 - priceRatio) * 4)) * 10) / 10;
    const cheaper = Math.round((1 - priceRatio) * 100);
    return {
      ...o,
      valueScore: score,
      valueExplanation: `Note ${r.score}/${r.scale} (${r.count} avis, ${r.sourceName}) et prix ${cheaper >= 0 ? `${cheaper} % sous` : `${-cheaper} % au-dessus de`} la médiane des offres comparables.`,
    };
  });
}

export function filterHotels(offers: RankedHotelOffer[], q: HotelQuery): RankedHotelOffer[] {
  return offers.filter((o) => {
    if (q.maxPerNight && o.price.perNightCents > q.maxPerNight * 100) return false;
    if (q.minStars && (o.property.stars ?? 0) < q.minStars) return false;
    if (q.minRating && (!o.property.rating || (o.property.rating.score / o.property.rating.scale) * 10 < q.minRating)) return false;
    if (q.types?.length && !q.types.includes(o.property.type)) return false;
    if (q.amenities?.length && !q.amenities.every((a) => o.property.amenities.includes(a))) return false;
    if (q.neighborhood && o.property.neighborhood !== q.neighborhood) return false;
    if (q.breakfast && o.board === "room_only") return false;
    if (q.refundable && o.cancellation.refundable !== true) return false;
    if (q.maxDistanceKm && o.property.distanceToCenterKm > q.maxDistanceKm) return false;
    return true;
  });
}

export function sortHotels(offers: RankedHotelOffer[], sort: HotelQuery["sort"]) {
  const arr = [...offers];
  if (sort === "price") return arr.sort((a, b) => a.price.estimatedTotalCents - b.price.estimatedTotalCents);
  if (sort === "rating") return arr.sort((a, b) => (b.property.rating?.score ?? 0) - (a.property.rating?.score ?? 0));
  if (sort === "distance") return arr.sort((a, b) => a.property.distanceToCenterKm - b.property.distanceToCenterKm);
  return arr.sort((a, b) => (b.valueScore ?? -1) - (a.valueScore ?? -1));
}

export async function searchHotels(raw: unknown) {
  const q = hotelQuerySchema.parse(raw);
  const dest = getDestination(q.city);
  if (!dest) throw new UserFacingError("Destination inconnue. Choisissez une ville proposée.");
  if (daysBetween(todayIn(), q.checkin) < 0) throw new UserFacingError("La date d'arrivée est déjà passée.");
  const params: HotelSearchParams = { citySlug: dest.slug, lat: dest.lat, lon: dest.lon, checkin: q.checkin, checkout: q.checkout, adults: q.adults, rooms: q.rooms, currency: q.currency };
  const mode = hotelDataMode();
  const run = await runProviders(
    hotelProviders().map((p) => ({ id: p.id, name: p.name, isDemo: p.isDemo, isConfigured: () => p.isConfigured(), run: (s: AbortSignal) => p.search(params, s) })),
    JSON.stringify(params),
    Number(process.env.PROVIDER_TIMEOUT_MS ?? 12000),
  );
  const fx = await getFxTable();
  const pure = run.results.filter((o) => (mode === "demo" ? o.source.isDemo : true));
  const merged = mergeHotelOffers(normalizeHotelCurrency(pure, q.currency, fx));
  const ranked = rankValue(merged);
  const neighborhoods = [...new Set(ranked.map((o) => o.property.neighborhood).filter((x): x is string => !!x))];
  const amenities = [...new Set(ranked.flatMap((o) => o.property.amenities))].sort();
  const offers = sortHotels(filterHotels(ranked, q), q.sort);
  const warnings: string[] = [];
  if (mode === "demo") warnings.push("Mode démonstration : établissements, prix et notes fictifs. Ajoutez une clé LiteAPI pour des offres réelles.");
  return {
    mode,
    destination: { slug: dest.slug, name: dest.name.fr, lat: dest.lat, lon: dest.lon, airports: dest.airports },
    nights: daysBetween(q.checkin, q.checkout),
    currency: q.currency,
    offers,
    totalBeforeFilters: ranked.length,
    neighborhoods,
    amenities,
    providers: run.statuses as ProviderRunStatus[],
    partial: run.partial,
    fx: { source: fx.source, date: fx.date },
    warnings,
    explanation:
      "Rapport qualité-prix = note des voyageurs (pondérée par le nombre d'avis) comparée au prix total estimé, par rapport à la médiane des offres pour les mêmes dates et la même occupation.",
  };
}
