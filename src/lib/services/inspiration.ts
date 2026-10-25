/**
 * Mode « Je ne sais pas où partir » : propose des destinations compatibles avec un budget RÉEL total
 * (vol estimé + hébergement + coûts sur place), la saison, la température voulue et les envies.
 * Toutes les valeurs sont des estimations ; l'utilisateur peut lancer une vraie recherche depuis chaque carte.
 */
import { z } from "zod";
import { zBool } from "@/lib/utils/zod";
import { DESTINATIONS, MONTHS_FR } from "@/data/destinations";
import { TAGS, type Destination, type Month, type Tag } from "@/data/types";
import { COUNTRIES } from "@/data/countries";
import { convertCents, getFxTable } from "@/lib/providers/fx";
import { estimateFlightHours, estimateRoundTripCents } from "./estimates";
import { resolveAirports } from "./airports";
import { scoreMonths } from "./seasons";
import { UserFacingError } from "./flight-search";

export const inspirationSchema = z.object({
  origin: z.string().min(3).default("PAR"),
  budget: z.coerce.number().positive().max(100000),
  budgetScope: z.enum(["per_person", "total"]).default("per_person"),
  travelers: z.coerce.number().int().min(1).max(10).default(1),
  nights: z.coerce.number().int().min(1).max(60).default(5),
  month: z.coerce.number().int().min(0).max(12).default(0), // 0 = flexible (meilleur mois)
  tags: z.array(z.enum(Object.keys(TAGS) as [Tag, ...Tag[]])).default([]),
  tempMin: z.coerce.number().min(-30).max(45).optional(),
  tempMax: z.coerce.number().min(-30).max(50).optional(),
  maxFlightHours: z.coerce.number().min(1).max(30).optional(),
  avoidCrowds: zBool(false),
  hiddenGems: zBool(false),
  currency: z.string().regex(/^[A-Z]{3}$/).default("EUR"),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});
export type InspirationQuery = z.infer<typeof inspirationSchema>;

export type InspirationResult = {
  destination: Pick<Destination, "slug" | "name" | "countryIso" | "lat" | "lon" | "tags" | "summary" | "hiddenGem" | "airports">;
  countryName: string;
  month: number;
  monthName: string;
  estimate: { flightCents: number; stayCents: number; totalCents: number; perPersonCents: number; currency: string };
  climate: { tmax: number; precip: number };
  crowdLevel: 1 | 2 | 3;
  flightHours: number | null;
  score: number;
  fits: boolean;
  reasons: string[];
  warnings: string[];
};

export async function inspire(raw: unknown) {
  const q = inspirationSchema.parse(raw);
  const origin = resolveAirports(q.origin)[0];
  if (!origin) throw new UserFacingError("Aéroport de départ inconnu");
  const fx = await getFxTable();
  const cur = (eur: number) => convertCents(eur, "EUR", q.currency, fx);
  const budgetPerPerson = Math.round((q.budgetScope === "total" ? q.budget / q.travelers : q.budget) * 100);
  const rooms = Math.ceil(q.travelers / 2);
  const results: InspirationResult[] = [];

  for (const d of DESTINATIONS) {
    if (d.airports.includes(origin)) continue;
    const hours = estimateFlightHours(origin, d.airports[0]);
    if (q.maxFlightHours && hours && hours > q.maxFlightHours) continue;
    if (q.hiddenGems && !d.hiddenGem) continue;
    const scores = scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })), {
      tempMin: q.tempMin,
      tempMax: q.tempMax,
      weights: q.avoidCrowds ? { weather: 0.4, price: 0.3, crowd: 0.3 } : undefined,
    });
    const candidates = q.month ? [scores[q.month - 1]] : scores;
    let best: InspirationResult | null = null;
    for (const s of candidates) {
      const flight = estimateRoundTripCents(origin, d.airports[0], s.month);
      if (flight == null) continue;
      const idx = d.priceIndex[s.month - 1];
      // Scénario économique réaliste : 55 % des coûts milieu de gamme.
      const lodgingPerPerson = Math.round((d.costs[0] * 0.55 * idx * 100 * rooms) / q.travelers) * q.nights;
      const daily = Math.round((d.costs[1] * 0.65 + d.costs[2] * 0.7 + d.costs[3] * 0.5) * 100) * q.nights;
      const perPerson = cur(flight) + cur(lodgingPerPerson) + cur(daily);
      const fits = perPerson <= budgetPerPerson;
      const tagMatch = q.tags.length ? q.tags.filter((t) => d.tags.includes(t)).length / q.tags.length : 0.5;
      const headroom = Math.max(-1, Math.min(1, (budgetPerPerson - perPerson) / budgetPerPerson));
      let score = s.weather * 0.35 + tagMatch * 100 * 0.3 + (headroom + 1) * 50 * 0.2 + s.crowd * (q.avoidCrowds ? 0.15 : 0.05) + (d.hiddenGem ? 5 : 0);
      if (!fits) score -= 40;
      const reasons: string[] = [];
      const warnings: string[] = [];
      if (fits) reasons.push(`Budget estimé ${Math.round(perPerson / 100)} ${q.currency}/pers., sous votre plafond`);
      else warnings.push(`Budget estimé ${Math.round(perPerson / 100)} ${q.currency}/pers., au-dessus de votre plafond`);
      if (s.weather >= 70) reasons.push(`Météo favorable en ${s.name} (${s.climate.tmax} °C)`);
      if (q.tags.length) {
        const matched = q.tags.filter((t) => d.tags.includes(t)).map((t) => TAGS[t].toLowerCase());
        if (matched.length) reasons.push(`Correspond à vos envies : ${matched.join(", ")}`);
      }
      if (s.crowdLevel === 1) reasons.push("Période peu fréquentée (estimation)");
      if (d.hiddenGem) reasons.push("Destination encore méconnue");
      for (const f of s.flags) if (["Saison des pluies", "Fortes chaleurs", "Fermetures possibles"].includes(f)) warnings.push(f);
      const res: InspirationResult = {
        destination: { slug: d.slug, name: d.name, countryIso: d.countryIso, lat: d.lat, lon: d.lon, tags: d.tags, summary: d.summary, hiddenGem: d.hiddenGem, airports: d.airports },
        countryName: COUNTRIES[d.countryIso]?.fr ?? d.countryIso,
        month: s.month,
        monthName: MONTHS_FR[s.month - 1],
        estimate: { flightCents: cur(flight), stayCents: cur(lodgingPerPerson) + cur(daily), totalCents: perPerson * q.travelers, perPersonCents: perPerson, currency: q.currency },
        climate: { tmax: s.climate.tmax, precip: s.climate.precip },
        crowdLevel: s.crowdLevel,
        flightHours: hours,
        score: Math.round(score),
        fits,
        reasons,
        warnings,
      };
      if (!best || res.score > best.score) best = res;
    }
    if (best) results.push(best);
  }
  results.sort((a, b) => Number(b.fits) - Number(a.fits) || b.score - a.score);
  const fitting = results.filter((r) => r.fits);
  return {
    origin,
    params: q,
    results: (fitting.length ? fitting : results).slice(0, q.limit),
    nothingFits: fitting.length === 0,
    disclaimer:
      "Estimations DINO : vol estimé par un modèle distance + saison, séjour en gamme économique d'après des coûts journaliers éditoriaux. Lancez une recherche pour obtenir les prix réels disponibles.",
    monthLabel: q.month ? MONTHS_FR[(q.month as Month) - 1] : "meilleur mois pour chaque destination",
  };
}
