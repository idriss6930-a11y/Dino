import type { FlightOffer } from "@/lib/providers/types";

// Google Flights n'a pas d'API publique : on ouvre la même recherche sur leur site.
export function googleFlightsUrl(offer: FlightOffer): string | null {
  const [out, back] = offer.slices;
  if (!out) return null;
  let q = `Flights to ${out.destination} from ${out.origin} on ${out.departLocal.slice(0, 10)}`;
  if (back) q += ` through ${back.departLocal.slice(0, 10)}`;
  const params = new URLSearchParams({ q, hl: "fr", curr: offer.price.currency });
  return `https://www.google.com/travel/flights?${params}`;
}
