/**
 * Recommandations personnalisées et explicables.
 * Signaux utilisés (uniquement ceux que l'utilisateur a choisi de partager) : styles de voyage déclarés,
 * préférences climatiques, budget habituel, destinations enregistrées / consultées / écartées.
 * Aucune donnée sensible. Une place sur quatre est réservée à une « découverte » hors des habitudes.
 * Si la personnalisation est désactivée, DINO affiche une sélection de saison identique pour tous.
 */
import { and, eq, gte } from "drizzle-orm";
import { DESTINATIONS, MONTHS_FR } from "@/data/destinations";
import { TAGS, type Destination, type Tag } from "@/data/types";
import { COUNTRIES } from "@/data/countries";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { scoreMonths } from "./seasons";
import { estimateRoundTripCents } from "./estimates";
import { resolveAirports } from "./airports";

export type Recommendation = {
  slug: string;
  name: string;
  countryName: string;
  summary: string;
  tags: Tag[];
  month: number;
  monthName: string;
  score: number;
  reasons: string[];
  discovery: boolean;
  hiddenGem: boolean;
};

type Profile = {
  tagWeights: Map<Tag, number>;
  dismissed: Set<string>;
  seen: Set<string>;
  tempMin?: number;
  tempMax?: number;
  budgetCents?: number | null;
  homeAirport?: string | null;
  personalized: boolean;
};

const W = { save: 3, like: 2, search: 1, view: 0.5, dismiss: -3 } as const;

export async function buildProfile(userId: string | null): Promise<Profile> {
  const empty: Profile = { tagWeights: new Map(), dismissed: new Set(), seen: new Set(), personalized: false };
  if (!userId) return empty;
  const db = await getDb();
  const [p] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  if (!p || !p.personalizationEnabled) return { ...empty, homeAirport: p?.homeAirport };
  const prof: Profile = { ...empty, personalized: true, tempMin: p.climateMinC ?? undefined, tempMax: p.climateMaxC ?? undefined, budgetCents: p.typicalBudgetCents, homeAirport: p.homeAirport };
  for (const t of p.travelStyles as Tag[]) prof.tagWeights.set(t, (prof.tagWeights.get(t) ?? 0) + 3);
  const since = new Date(Date.now() - 180 * 86400_000);
  const inter = await db.select().from(s.interactions).where(and(eq(s.interactions.userId, userId), gte(s.interactions.createdAt, since)));
  const wish = await db.select({ slug: s.wishlistItems.destinationSlug }).from(s.wishlistItems).where(eq(s.wishlistItems.userId, userId));
  const signals = [...inter.map((i) => ({ slug: i.destinationSlug, w: W[i.kind] })), ...wish.map((x) => ({ slug: x.slug, w: W.save }))];
  for (const sig of signals) {
    const d = DESTINATIONS.find((x) => x.slug === sig.slug);
    if (!d) continue;
    if (sig.w < 0) prof.dismissed.add(d.slug);
    else prof.seen.add(d.slug);
    for (const t of d.tags) prof.tagWeights.set(t, (prof.tagWeights.get(t) ?? 0) + sig.w / d.tags.length);
  }
  return prof;
}

function tagAffinity(d: Destination, weights: Map<Tag, number>) {
  const total = [...weights.values()].filter((v) => v > 0).reduce((a, b) => a + b, 0);
  if (!total) return { score: 0, matched: [] as Tag[] };
  const matched = d.tags.filter((t) => (weights.get(t) ?? 0) > 0);
  const sc = matched.reduce((a, t) => a + (weights.get(t) ?? 0), 0) / total;
  return { score: Math.min(1, sc * 1.6), matched };
}

export function recommend(profile: Profile, opts: { month?: number; limit?: number; now?: Date } = {}): Recommendation[] {
  const now = opts.now ?? new Date();
  const month = opts.month ?? ((now.getUTCMonth() + 2) % 12) + 1; // par défaut : dans ~1-2 mois
  const limit = opts.limit ?? 8;
  const origin = profile.homeAirport ? resolveAirports(profile.homeAirport)[0] : undefined;
  const scored = DESTINATIONS.filter((d) => !profile.dismissed.has(d.slug)).map((d) => {
    const ms = scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })), { tempMin: profile.tempMin, tempMax: profile.tempMax })[month - 1];
    const aff = tagAffinity(d, profile.tagWeights);
    const reasons: string[] = [];
    let score = ms.overall * 0.5;
    if (profile.personalized && aff.matched.length) {
      score += aff.score * 40;
      reasons.push(`Correspond à vos goûts : ${aff.matched.map((t) => TAGS[t].toLowerCase()).join(", ")}`);
    }
    if (ms.weather >= 70) reasons.push(`Bonne période météo en ${MONTHS_FR[month - 1]} (${ms.climate.tmax} °C)`);
    if (ms.crowdLevel === 1) reasons.push("Peu fréquentée à cette période (estimation)");
    if (ms.price >= 70) reasons.push("Basse saison : prix généralement plus doux");
    if (profile.budgetCents && origin) {
      const f = estimateRoundTripCents(origin, d.airports[0], month);
      const stay = (d.costs[0] / 2 + d.costs[1] + d.costs[2] + d.costs[3]) * 100 * 6;
      if (f != null && f + stay <= profile.budgetCents) {
        score += 8;
        reasons.push("Dans votre budget habituel (estimation, 6 nuits)");
      } else if (f != null) score -= 6;
    }
    if (d.hiddenGem) score += 3;
    return { d, ms, aff, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);

  const picks: typeof scored = [];
  const discoveries = scored.filter((x) => x.aff.matched.length === 0 && x.ms.overall >= 60);
  const main = profile.personalized && profile.tagWeights.size ? scored.filter((x) => x.aff.matched.length > 0) : scored;
  let di = 0;
  for (let i = 0; picks.length < limit && i < scored.length * 2; i++) {
    const wantDiscovery = profile.personalized && profile.tagWeights.size > 0 && (picks.length + 1) % 4 === 0 && di < discoveries.length;
    const cand = wantDiscovery ? discoveries[di++] : main.find((x) => !picks.includes(x)) ?? scored.find((x) => !picks.includes(x));
    if (cand && !picks.includes(cand)) picks.push(cand);
  }
  return picks.map((x) => {
    const discovery = profile.personalized && profile.tagWeights.size > 0 && x.aff.matched.length === 0;
    return {
      slug: x.d.slug,
      name: x.d.name.fr,
      countryName: COUNTRIES[x.d.countryIso]?.fr ?? x.d.countryIso,
      summary: x.d.summary,
      tags: x.d.tags,
      month,
      monthName: MONTHS_FR[month - 1],
      score: Math.round(x.score),
      reasons: discovery ? ["Découverte : hors de vos habitudes, pour éviter de toujours voir la même chose", ...x.reasons] : profile.personalized ? x.reasons : ["Sélection de saison (non personnalisée)", ...x.reasons],
      discovery,
      hiddenGem: x.d.hiddenGem,
    };
  });
}

/** Conseils aimés par des voyageurs aux goûts proches (≥ 2 styles de voyage en commun). */
export async function similarTravelersTips(userId: string, limit = 6) {
  const db = await getDb();
  const [me] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, userId));
  if (!me?.personalizationEnabled || (me.travelStyles as string[]).length < 2) return [];
  const others = await db.select({ userId: s.userPreferences.userId, styles: s.userPreferences.travelStyles }).from(s.userPreferences).where(eq(s.userPreferences.personalizationEnabled, true));
  const mine = new Set(me.travelStyles as string[]);
  const similar = others.filter((o) => o.userId !== userId && (o.styles as string[]).filter((t) => mine.has(t)).length >= 2).map((o) => o.userId);
  if (!similar.length) return [];
  const likes = await db.select({ tipId: s.tipLikes.tipId, userId: s.tipLikes.userId }).from(s.tipLikes);
  const counts = new Map<string, number>();
  for (const l of likes) if (similar.includes(l.userId)) counts.set(l.tipId, (counts.get(l.tipId) ?? 0) + 1);
  const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  if (!ids.length) return [];
  const tips = await db.select().from(s.tips).where(eq(s.tips.status, "published"));
  return tips.filter((t) => ids.includes(t.id) && t.authorId !== userId).map((t) => ({ id: t.id, title: t.title, destinationSlug: t.destinationSlug, likedBySimilar: counts.get(t.id) ?? 0 }));
}
