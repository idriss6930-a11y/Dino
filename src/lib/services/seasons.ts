/**
 * Calendrier intelligent des destinations : trois notions DISTINCTES par mois —
 * météo (confort climatique), économie (niveau de prix saisonnier) et foule (affluence relative).
 * Toutes les entrées sont étiquetées avec leur nature (mesure climatique vs estimation éditoriale).
 */
import { and, eq } from "drizzle-orm";
import type { Destination, Month } from "@/data/types";
import { MONTHS_FR } from "@/data/destinations";
import { getDb } from "@/lib/db/client";
import { climateNormals } from "@/lib/db/schema";

export type ClimateSource = { kind: "era5" | "editorial"; label: string };
export type MonthClimate = { tmax: number; tmin: number; precip: number };

export type MonthScore = {
  month: Month;
  name: string;
  climate: MonthClimate;
  weather: number; // 0-100
  price: number; // 0-100 (100 = le moins cher)
  crowd: number; // 0-100 (100 = le plus calme)
  overall: number;
  crowdLevel: 1 | 2 | 3;
  priceIndex: number;
  events: string[];
  flags: string[];
  pros: string[];
  cons: string[];
};

export type Prefs = { tempMin?: number; tempMax?: number; weights?: { weather: number; price: number; crowd: number }; wantsAurora?: boolean };

const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

export function weatherScore(d: Destination, m: Month, c: MonthClimate, prefs: Prefs = {}): number {
  const beach = d.tags.includes("plage");
  const lo = prefs.tempMin ?? (beach ? 24 : 17);
  const hi = prefs.tempMax ?? (beach ? 31 : 27);
  let s = 100;
  if (c.tmax < lo) s -= (lo - c.tmax) * 6;
  if (c.tmax > hi) s -= (c.tmax - hi) * 8;
  if (c.precip > 60) s -= Math.min(45, (c.precip - 60) / 4);
  if (d.seasons.rainy?.includes(m)) s -= 10;
  if (d.seasons.hot?.includes(m)) s -= 8;
  // Pour les destinations d'aurores, l'hiver est la saison recherchée.
  if (d.tags.includes("aurores") && d.seasons.aurora?.includes(m)) s = Math.max(s, prefs.wantsAurora === false ? s : 70);
  return clamp(s);
}

export function priceScore(idx: number) {
  return clamp(100 - ((idx - 0.7) / (1.5 - 0.7)) * 100);
}

export function crowdScore(level: 1 | 2 | 3) {
  return level === 1 ? 100 : level === 2 ? 60 : 20;
}

export async function getClimate(d: Destination): Promise<{ months: MonthClimate[]; source: ClimateSource }> {
  try {
    const db = await getDb();
    const rows = await db.select().from(climateNormals).where(and(eq(climateNormals.destinationSlug, d.slug), eq(climateNormals.sourceId, "open-meteo")));
    if (rows.length === 12) {
      const months = rows.sort((a, b) => a.month - b.month).map((r) => ({ tmax: Math.round(r.tmaxC), tmin: Math.round(r.tminC), precip: Math.round(r.precipMm) }));
      return { months, source: { kind: "era5", label: `Moyennes ${rows[0].period}, réanalyses ERA5 via Open-Meteo (CC BY 4.0)` } };
    }
  } catch {
    // base indisponible : repli sur les valeurs éditoriales
  }
  return {
    months: d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })),
    source: { kind: "editorial", label: "Normales indicatives arrondies (saisie éditoriale DINO, à confirmer)" },
  };
}

const HAZARD = /typhon|cyclone|ouragan|mousson|pluie|chaleur|canicule|tempête|inondation|fermeture|saison basse|basse saison/i;

export function scoreMonths(d: Destination, climate: MonthClimate[], prefs: Prefs = {}): MonthScore[] {
  const w = prefs.weights ?? { weather: 0.45, price: 0.35, crowd: 0.2 };
  const tot = w.weather + w.price + w.crowd || 1;
  return climate.map((c, i) => {
    const m = (i + 1) as Month;
    const weather = weatherScore(d, m, c, prefs);
    const price = priceScore(d.priceIndex[i]);
    const crowd = crowdScore(d.crowd[i]);
    const events = d.events.filter((e) => e.months.includes(m)).map((e) => e.name);
    const flags: string[] = [];
    if (d.seasons.rainy?.includes(m)) flags.push("Saison des pluies");
    if (d.seasons.hot?.includes(m)) flags.push("Fortes chaleurs");
    if (d.seasons.cold?.includes(m)) flags.push("Froid");
    if (d.seasons.aurora?.includes(m)) flags.push("Saison des aurores");
    if (d.events.some((e) => e.months.includes(m) && e.impact.includes("fermetures"))) flags.push("Fermetures possibles");
    const pros: string[] = [];
    const cons: string[] = [];
    if (weather >= 75) pros.push(`Climat agréable (${c.tmax} °C en journée)`);
    if (weather < 45) cons.push(c.tmax > 30 ? `Très chaud (${c.tmax} °C)` : c.precip > 120 ? `Pluvieux (${c.precip} mm)` : `Frais (${c.tmax} °C)`);
    if (price >= 70) pros.push("Prix généralement bas");
    if (price <= 30) cons.push("Prix de haute saison");
    if (crowd === 100) pros.push("Peu de touristes");
    if (crowd === 20) cons.push("Forte affluence");
    for (const e of d.events.filter((x) => x.months.includes(m))) {
      // Aléa (typhon, mousson…) ou fermetures = inconvénient. Événement populaire (impact « foule ») = atout, avec hausse
      // des prix signalée. Salon professionnel (impact « prix » seul) = inconvénient. Impact « info » seul = simple information.
      if (HAZARD.test(e.name) || e.impact.includes("fermetures")) cons.push(e.name);
      else if (e.impact.includes("foule")) {
        pros.push(e.name);
        if (e.impact.includes("prix")) cons.push(`Prix en hausse (${e.name})`);
      } else if (e.impact.includes("prix")) cons.push(`Prix en hausse (${e.name})`);
    }
    return {
      month: m,
      name: MONTHS_FR[i],
      climate: c,
      weather,
      price,
      crowd,
      overall: clamp((weather * w.weather + price * w.price + crowd * w.crowd) / tot),
      crowdLevel: d.crowd[i],
      priceIndex: d.priceIndex[i],
      events,
      flags,
      pros,
      cons,
    };
  });
}

const top = (arr: MonthScore[], key: keyof Pick<MonthScore, "weather" | "price" | "crowd" | "overall">, n = 3) =>
  [...arr].sort((a, b) => b[key] - a[key] || a.month - b.month).slice(0, n);

/** Répond à « quel est le meilleur mois pour payer moins cher et éviter les touristes ? », sans sacrifier la météo. */
export function bestMonths(scores: MonthScore[]) {
  const acceptable = scores.filter((s) => s.weather >= 45);
  const pool = acceptable.length ? acceptable : scores;
  const cheapQuiet = [...pool].sort((a, b) => b.price + b.crowd - (a.price + a.crowd) || b.weather - a.weather)[0];
  return {
    weather: top(scores, "weather"),
    price: top(scores, "price"),
    crowd: top(scores, "crowd"),
    overall: top(scores, "overall"),
    cheapAndQuiet: cheapQuiet,
    cheapAndQuietExplanation: `${cheapQuiet.name[0].toUpperCase()}${cheapQuiet.name.slice(1)} combine le niveau de prix le plus bas et la plus faible affluence parmi les mois où la météo reste correcte (score météo ${cheapQuiet.weather}/100).`,
  };
}
