/**
 * Estimations DINO (présentées comme telles, jamais comme des prix) : vol aller-retour estimé à partir de la
 * distance et de la saison, durée de vol estimée. Utilisées quand aucun prix réel n'est disponible
 * (exploration « Je ne sais pas où partir », comparaison de mois dans le calculateur de budget).
 */
import { DESTINATIONS } from "@/data/destinations";
import { distanceKm } from "./airports";

export function estimateRoundTripCents(originIata: string, destIata: string, month: number): number | null {
  const km = distanceKm(originIata, destIata);
  if (km == null) return null;
  const dest = DESTINATIONS.find((d) => d.airports.includes(destIata));
  const season = dest ? dest.priceIndex[month - 1] : 1;
  const oneWay = 30 + 0.09 * Math.pow(km, 0.93);
  return Math.round(oneWay * 2 * season) * 100;
}

export function estimateFlightHours(originIata: string, destIata: string): number | null {
  const km = distanceKm(originIata, destIata);
  if (km == null) return null;
  const direct = km / 800 + 0.6;
  return Math.round((km > 4500 ? direct + 2.5 : direct) * 10) / 10; // escale probable en long-courrier
}
