import { getFxTable } from "@/lib/providers/fx";
import type { Cabin } from "@/lib/providers/types";
import { todayIn } from "@/lib/utils/dates";
import { analyzePriceHistory, demoHistory, loadObservedSeries, type PriceInsight } from "./price-history";
import { searchFlights } from "./flight-search";

/**
 * « Dois-je acheter ce billet aujourd'hui ? » pour une recherche donnée.
 * Le prix actuel = meilleur coût total estimé de la recherche, comparé à l'historique du même produit.
 */
export async function flightPriceInsight(raw: Record<string, unknown>): Promise<PriceInsight & { offerSummary?: string; historySource: string }> {
  const result = await searchFlights({ ...raw, sort: "price" });
  const cheapest = result.offers[0];
  const today = todayIn();
  if (!cheapest) {
    return {
      ...analyzePriceHistory({ points: [], currentCents: 0, currency: result.currency, travelDate: String(raw.departDate ?? today), today, isDemo: result.mode === "demo" }),
      available: false,
      reason: "Aucune offre trouvée pour cette recherche : impossible d'évaluer le prix.",
      historySource: "aucune",
    };
  }
  const fx = await getFxTable();
  const isDemo = cheapest.source.isDemo;
  let points = await loadObservedSeries(cheapest.comparableKey, result.currency, fx, isDemo);
  let historySource = isDemo ? "Observations de démonstration enregistrées par DINO" : "Prix réellement observés par DINO lors des recherches et vérifications d'alertes";
  if (isDemo && result.mode === "demo") {
    const slices = cheapest.slices.map((s) => ({ origin: s.origin, destination: s.destination, date: s.departLocal.slice(0, 10) }));
    const backfill = demoHistory({ slices, cabin: (raw.cabin as Cabin) ?? "economy", adults: Number(raw.adults ?? 1), children: Number(raw.children ?? 0), today });
    const have = new Set(points.map((p) => p.date));
    points = [...points, ...backfill.filter((p) => !have.has(p.date))];
    historySource = "Historique SYNTHÉTIQUE de démonstration (modèle DINO), pas des prix réels";
  }
  points.push({ date: today, cents: cheapest.price.ticketTotalCents });
  const insight = analyzePriceHistory({
    points,
    currentCents: cheapest.price.ticketTotalCents,
    currency: result.currency,
    travelDate: cheapest.slices[0].departLocal.slice(0, 10),
    today,
    isDemo,
    destinationAirport: cheapest.slices[0].destination,
  });
  return {
    ...insight,
    historySource,
    offerSummary: `${cheapest.slices[0].origin} → ${cheapest.slices[0].destination}, ${cheapest.validatingCarrier}, source : ${cheapest.source.name}`,
  };
}
