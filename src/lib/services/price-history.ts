/**
 * Historique tarifaire et analyse « acheter maintenant ou attendre ? ».
 *
 * Principes de rigueur :
 * - aucune règle universelle (« le mardi est moins cher ») n'est présentée comme un fait ;
 * - l'analyse s'appuie d'abord sur les prix RÉELLEMENT observés pour le même produit (mêmes dates, même classe,
 *   même nombre de voyageurs) ; sans données suffisantes, la prévision est déclarée indisponible ;
 * - la projection est une simple extrapolation de tendance avec intervalle d'incertitude, jamais une promesse ;
 * - les données de démonstration restent étiquetées comme telles de bout en bout.
 */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { priceObservations } from "@/lib/db/schema";
import { DESTINATIONS, MONTHS_FR } from "@/data/destinations";
import { convertCents, type FxTable } from "@/lib/providers/fx";
import { demoFareCents } from "@/lib/providers/flights/demo";
import type { Cabin, FlightOffer } from "@/lib/providers/types";
import { addDays, daysBetween, monthOf, todayIn, weekdayOf } from "@/lib/utils/dates";
import { newId } from "@/lib/utils/ids";

export type PricePoint = { date: string; cents: number };

export type Factor = { label: string; effect: "up" | "down" | "neutral"; detail: string; kind: "fait" | "estimation" | "prévision" };

export type PriceInsight = {
  available: boolean;
  reason?: string;
  isDemo: boolean;
  currency: string;
  currentCents: number;
  leadDays: number;
  stats?: { n: number; spanDays: number; minCents: number; medianCents: number; maxCents: number; p25: number; p75: number; percentile: number; lowerShare: number };
  change7d?: { cents: number; pct: number };
  trendPctPerWeek?: number;
  verdict?: "bon prix" | "prix dans la moyenne" | "prix élevé";
  recommendation: "buy_now" | "watch" | "compare_dates" | "insufficient_data";
  recommendationText: string;
  confidence: { score: number; level: "aucune" | "faible" | "moyenne" | "élevée" };
  factors: Factor[];
  series: PricePoint[];
  projection: { date: string; lowCents: number; midCents: number; highCents: number }[];
  lastUpdated: string | null;
  method: string;
};

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
};

/** Une valeur par jour (minimum observé du jour) pour éviter qu'une journée très échantillonnée pèse trop. */
export function dailyMin(points: PricePoint[]): PricePoint[] {
  const m = new Map<string, number>();
  for (const p of points) m.set(p.date, Math.min(p.cents, m.get(p.date) ?? Infinity));
  return [...m.entries()].map(([date, cents]) => ({ date, cents })).sort((a, b) => a.date.localeCompare(b.date));
}

function linearRegression(ys: number[]) {
  const n = ys.length;
  const xs = ys.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const resid = ys.map((y, i) => y - (intercept + slope * i));
  const sd = Math.sqrt(resid.reduce((a, r) => a + r * r, 0) / Math.max(1, n - 2));
  return { slope, intercept, sd };
}

/** Facteurs contextuels connus (calendrier, saison, délai). Ils expliquent, ils ne prédisent pas. */
export function contextFactors(opts: { travelDate: string; leadDays: number; destinationAirport?: string }): Factor[] {
  const f: Factor[] = [];
  const m = monthOf(opts.travelDate);
  const wd = weekdayOf(opts.travelDate);
  const dest = opts.destinationAirport ? DESTINATIONS.find((d) => d.airports.includes(opts.destinationAirport!)) : undefined;
  if (opts.leadDays < 14)
    f.push({ label: "Départ très proche", effect: "up", detail: `Départ dans ${opts.leadDays} jours : sur la plupart des liaisons, les places les moins chères sont souvent déjà vendues à ce stade.`, kind: "estimation" });
  else if (opts.leadDays > 300)
    f.push({ label: "Réservation très anticipée", effect: "neutral", detail: "Tous les tarifs ne sont pas encore publiés : les prix peuvent encore évoluer dans les deux sens.", kind: "estimation" });
  if (dest) {
    const idx = dest.priceIndex[m - 1];
    if (idx >= 1.2) f.push({ label: `Haute saison à ${dest.name.fr}`, effect: "up", detail: `${MONTHS_FR[m - 1]} est une période de forte demande (estimation éditoriale DINO).`, kind: "estimation" });
    else if (idx <= 0.85) f.push({ label: `Basse saison à ${dest.name.fr}`, effect: "down", detail: `${MONTHS_FR[m - 1]} est généralement une période plus calme et moins chère (estimation éditoriale DINO).`, kind: "estimation" });
    for (const ev of dest.events.filter((e) => e.months.includes(m as never) && e.impact.includes("prix")))
      f.push({ label: ev.name, effect: "up", detail: `Événement susceptible de faire monter les prix${ev.note ? ` — ${ev.note}` : ""}. Dates à vérifier.`, kind: "fait" });
  }
  const md = opts.travelDate.slice(5);
  if ((md >= "07-05" && md <= "08-25") || md >= "12-19" || md <= "01-03")
    f.push({ label: "Vacances scolaires (Europe)", effect: "up", detail: "Période de vacances scolaires dans de nombreux pays européens : demande plus forte.", kind: "estimation" });
  if (wd === 5 || wd === 0)
    f.push({ label: wd === 5 ? "Départ un vendredi" : "Départ un dimanche", effect: "up", detail: "Jour de voyage souvent très demandé ; un départ en milieu de semaine est parfois moins cher (à vérifier sur le calendrier des prix).", kind: "estimation" });
  return f;
}

/**
 * Analyse pure (testable) d'une série d'observations pour un même produit tarifaire.
 */
export function analyzePriceHistory(input: {
  points: PricePoint[];
  currentCents: number;
  currency: string;
  travelDate: string;
  today: string;
  isDemo: boolean;
  destinationAirport?: string;
  minPoints?: number;
}): PriceInsight {
  const series = dailyMin(input.points.filter((p) => p.date <= input.today));
  const leadDays = Math.max(0, daysBetween(input.today, input.travelDate));
  const factors = contextFactors({ travelDate: input.travelDate, leadDays, destinationAirport: input.destinationAirport });
  const lastUpdated = series.at(-1)?.date ?? null;
  const method =
    "Comparaison du prix actuel avec les prix observés pour exactement le même vol recherché (mêmes dates, classe et voyageurs), tendance linéaire sur les 21 derniers jours d'observation et facteurs de calendrier connus.";
  const minPoints = input.minPoints ?? 7;
  const spanDays = series.length ? daysBetween(series[0].date, series.at(-1)!.date) : 0;
  if (series.length < minPoints || spanDays < 6) {
    return {
      available: false,
      reason: `Historique insuffisant : ${series.length} jour(s) d'observation sur ${spanDays} jour(s). Il en faut au moins ${minPoints} sur une semaine pour une analyse honnête.`,
      isDemo: input.isDemo,
      currency: input.currency,
      currentCents: input.currentCents,
      leadDays,
      recommendation: "insufficient_data",
      recommendationText: "Pas assez de données pour conseiller d'attendre ou d'acheter. Créez une alerte : DINO enregistrera l'évolution du prix et vous préviendra en cas de baisse réelle.",
      confidence: { score: 0, level: "aucune" },
      factors,
      series,
      projection: [],
      lastUpdated,
      method,
    };
  }
  const values = series.map((p) => p.cents);
  const sorted = [...values].sort((a, b) => a - b);
  const lowerShare = values.filter((v) => v < input.currentCents).length / values.length;
  const percentile = Math.round(lowerShare * 100);
  const stats = {
    n: series.length,
    spanDays,
    minCents: sorted[0],
    medianCents: quantile(sorted, 0.5),
    maxCents: sorted.at(-1)!,
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    percentile,
    lowerShare,
  };
  const weekAgo = series.filter((p) => daysBetween(p.date, input.today) >= 6).at(-1);
  const change7d = weekAgo ? { cents: input.currentCents - weekAgo.cents, pct: Math.round(((input.currentCents - weekAgo.cents) / weekAgo.cents) * 1000) / 10 } : undefined;

  const recent = series.slice(-21).map((p) => p.cents);
  const reg = linearRegression(recent);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const trendPctPerWeek = Math.round(((reg.slope * 7) / mean) * 1000) / 10;
  const cv = reg.sd / mean;

  // Projection : extrapolation de tendance amortie sur 14 jours, bornée par la date de départ.
  const horizon = Math.min(14, Math.max(0, leadDays - 1));
  const projection = Array.from({ length: horizon }, (_, i) => {
    const k = i + 1;
    const mid = input.currentCents + reg.slope * k * 0.6;
    const band = 1.64 * reg.sd * Math.sqrt(1 + k / recent.length);
    return { date: addDays(input.today, k), lowCents: Math.max(0, Math.round(mid - band)), midCents: Math.round(mid), highCents: Math.round(mid + band) };
  });

  const verdict: PriceInsight["verdict"] = input.currentCents <= stats.p25 ? "bon prix" : input.currentCents >= stats.p75 ? "prix élevé" : "prix dans la moyenne";

  let recommendation: PriceInsight["recommendation"];
  let text: string;
  if (verdict === "bon prix" || leadDays < 14) {
    recommendation = "buy_now";
    text =
      verdict === "bon prix"
        ? `Le prix actuel fait partie des ${Math.max(1, percentile)} % les plus bas observés pour ce vol. Attendre comporte un risque de hausse.`
        : "Le départ approche : les baisses de dernière minute sont l'exception. Si l'itinéraire vous convient, réserver maintenant limite le risque.";
  } else if (verdict === "prix élevé" && leadDays > 30 && trendPctPerWeek <= 3) {
    recommendation = "watch";
    text = `Le prix est plus élevé que ${percentile} % des relevés précédents et le départ est encore loin : surveiller avec une alerte est raisonnable.`;
  } else if (verdict === "prix élevé") {
    recommendation = "compare_dates";
    text = "Le prix est élevé par rapport aux relevés précédents : comparez des dates voisines ou des aéroports proches avant de réserver.";
  } else {
    recommendation = trendPctPerWeek > 2 ? "buy_now" : "watch";
    text =
      trendPctPerWeek > 2
        ? `Prix dans la moyenne, mais la tendance récente est à la hausse (+${trendPctPerWeek} % par semaine).`
        : "Prix dans la moyenne des relevés, sans tendance nette : vous pouvez surveiller quelques jours avec une alerte.";
  }

  factors.unshift({
    label: "Position dans l'historique",
    effect: verdict === "bon prix" ? "down" : verdict === "prix élevé" ? "up" : "neutral",
    detail: `Prix actuel plus élevé que ${percentile} % des ${stats.n} jours d'observation (médiane : ${(stats.medianCents / 100).toFixed(0)} ${input.currency}).`,
    kind: "fait",
  });
  if (Math.abs(trendPctPerWeek) >= 1)
    factors.push({ label: "Tendance récente", effect: trendPctPerWeek > 0 ? "up" : "down", detail: `${trendPctPerWeek > 0 ? "+" : ""}${trendPctPerWeek} % par semaine sur les dernières observations.`, kind: "prévision" });

  // Confiance : volume de données, durée couverte, régularité, nature des données.
  let score = Math.min(40, series.length * 2) + Math.min(30, spanDays) + Math.max(0, 30 - cv * 200);
  if (input.isDemo) score = Math.min(score, 60);
  score = Math.round(Math.max(5, Math.min(95, score)));
  const level = score >= 70 ? "élevée" : score >= 45 ? "moyenne" : "faible";

  return {
    available: true,
    isDemo: input.isDemo,
    currency: input.currency,
    currentCents: input.currentCents,
    leadDays,
    stats,
    change7d,
    trendPctPerWeek,
    verdict,
    recommendation,
    recommendationText: text,
    confidence: { score, level },
    factors,
    series,
    projection,
    lastUpdated,
    method,
  };
}

/* ------------------------------ Persistance ------------------------------ */

function marketKeyOf(o: FlightOffer) {
  const cabin = o.comparableKey.split("|")[1] ?? "economy";
  return `${o.slices[0].origin}-${o.slices[0].destination}|${o.slices.length === 2 ? "RT" : o.slices.length === 1 ? "OW" : "MC"}|${cabin}`;
}

/** Enregistre le meilleur prix par produit et par source (au plus une observation par heure et par source). */
export async function recordFlightObservations(offers: FlightOffer[], fx: FxTable) {
  if (!offers.length) return;
  const db = await getDb();
  const best = new Map<string, FlightOffer>();
  for (const o of offers) {
    const k = `${o.comparableKey}#${o.source.id}`;
    const prev = best.get(k);
    if (!prev || o.price.ticketTotalCents < prev.price.ticketTotalCents) best.set(k, o);
  }
  const today = todayIn();
  const hourAgo = new Date(Date.now() - 3600_000);
  for (const o of best.values()) {
    const recent = await db
      .select({ id: priceObservations.id })
      .from(priceObservations)
      .where(and(eq(priceObservations.routeKey, o.comparableKey), eq(priceObservations.sourceId, o.source.id), gte(priceObservations.observedAt, hourAgo)))
      .limit(1);
    if (recent.length) continue;
    const travelDate = o.slices[0].departLocal.slice(0, 10);
    await db.insert(priceObservations).values({
      id: newId(),
      kind: "flight",
      routeKey: o.comparableKey,
      marketKey: marketKeyOf(o),
      travelDate,
      observedAt: new Date(),
      leadDays: Math.max(0, daysBetween(today, travelDate)),
      priceCents: o.price.ticketTotalCents,
      currency: o.price.currency,
      priceEurCents: convertCents(o.price.ticketTotalCents, o.price.currency, "EUR", fx),
      sourceId: o.source.id.startsWith("demo") ? "demo" : o.source.id,
      isDemo: o.source.isDemo,
    });
  }
}

/** Reconstitue l'historique synthétique d'un produit de démonstration (même modèle que le fournisseur démo). */
export function demoHistory(opts: { slices: { origin: string; destination: string; date: string }[]; cabin: Cabin; adults: number; children: number; today: string; days?: number }): PricePoint[] {
  const out: PricePoint[] = [];
  const pax = opts.adults + opts.children * 0.85;
  for (let k = opts.days ?? 45; k >= 1; k--) {
    const observedDate = addDays(opts.today, -k);
    let best = Infinity;
    for (let ci = 0; ci < 5; ci++) {
      for (const stops of [0, 1]) {
        const sum = opts.slices.reduce((a, s) => a + demoFareCents({ origin: s.origin, destination: s.destination, travelDate: s.date, observedDate, cabin: opts.cabin, carrierIndex: ci, stops }), 0);
        best = Math.min(best, sum);
      }
    }
    out.push({ date: observedDate, cents: Math.round((Math.round(best / 100) * 100 - 1) * pax) });
  }
  return out;
}

export async function loadObservedSeries(routeKey: string, currency: string, fx: FxTable, isDemo: boolean): Promise<PricePoint[]> {
  const db = await getDb();
  const rows = await db
    .select({ observedAt: priceObservations.observedAt, cents: priceObservations.priceCents, currency: priceObservations.currency })
    .from(priceObservations)
    .where(and(eq(priceObservations.routeKey, routeKey), eq(priceObservations.isDemo, isDemo)))
    .orderBy(desc(priceObservations.observedAt))
    .limit(2000);
  return rows.map((r) => ({ date: r.observedAt.toISOString().slice(0, 10), cents: convertCents(r.cents, r.currency, currency, fx) }));
}

export async function countObservations(): Promise<{ real: number; demo: number }> {
  const db = await getDb();
  const r = await db
    .select({ isDemo: priceObservations.isDemo, n: sql<number>`count(*)::int` })
    .from(priceObservations)
    .groupBy(priceObservations.isDemo);
  return { real: r.find((x) => !x.isDemo)?.n ?? 0, demo: r.find((x) => x.isDemo)?.n ?? 0 };
}
