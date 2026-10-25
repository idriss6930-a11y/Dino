/**
 * Connecteur Duffel (https://duffel.com/docs/api) — recherche de vols en temps réel (NDC + GDS).
 *
 * Variable d'environnement : DUFFEL_API_TOKEN (jeton « test » ou « live » créé sur app.duffel.com).
 * - En mode test, Duffel renvoie des offres de sa compagnie fictive « Duffel Airways » : DINO les marque comme
 *   données de test (isDemo) pour ne jamais les présenter comme de vrais tarifs.
 * - La réservation passe par l'API de commande Duffel (paiement, données passagers) : NON implémentée ici.
 *   DINO affiche donc « réservation non disponible » plutôt qu'un faux bouton.
 * - Coûts : Duffel facture par commande et peut facturer un excédent si le ratio recherches/commandes est trop
 *   élevé ; le cache DINO et la limitation des vérifications d'alertes réduisent ce risque.
 */
import { dayShift, localToUtc } from "@/lib/utils/dates";
import { fetchJson } from "../http";
import type { Cabin, FlightOffer, FlightProvider, FlightSearchParams, FlightSegment, FlightSlice, SourceRef } from "../types";
import { ProviderError } from "../types";
import { comparableFlightKey } from "./demo";

type DuffelPlace = { iata_code: string; time_zone?: string | null };
type DuffelSegment = {
  origin: DuffelPlace;
  destination: DuffelPlace;
  departing_at: string; // heure locale sans fuseau, ex. "2027-03-12T09:45:00"
  arriving_at: string;
  marketing_carrier: { iata_code: string; name: string };
  marketing_carrier_flight_number: string;
  passengers?: { baggages?: { type: "checked" | "carry_on"; quantity: number }[] }[];
};
type DuffelOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  base_amount?: string | null;
  tax_amount?: string | null;
  expires_at?: string;
  live_mode?: boolean;
  owner: { iata_code: string; name: string };
  slices: { segments: DuffelSegment[]; duration?: string | null }[];
  conditions?: {
    refund_before_departure?: { allowed: boolean } | null;
    change_before_departure?: { allowed: boolean } | null;
  };
};

const CABIN_MAP: Record<Cabin, string> = { economy: "economy", premium_economy: "premium_economy", business: "business", first: "first" };

const toCents = (s: string | null | undefined) => (s == null ? null : Math.round(Number(s) * 100));

export function mapDuffelOffer(o: DuffelOffer, params: FlightSearchParams, fetchedAt: string): FlightOffer {
  const source: SourceRef = { id: "duffel", name: o.live_mode === false ? "Duffel (mode test)" : "Duffel", isDemo: o.live_mode === false, freshness: "live" };
  const slices: FlightSlice[] = o.slices.map((s) => {
    const segments: FlightSegment[] = s.segments.map((seg) => {
      const originTz = seg.origin.time_zone || "UTC";
      const destinationTz = seg.destination.time_zone || "UTC";
      const departLocal = seg.departing_at.slice(0, 16);
      const arriveLocal = seg.arriving_at.slice(0, 16);
      const minutes = Math.round((localToUtc(arriveLocal, destinationTz).getTime() - localToUtc(departLocal, originTz).getTime()) / 60000);
      return {
        carrierCode: seg.marketing_carrier.iata_code,
        carrierName: seg.marketing_carrier.name,
        flightNumber: `${seg.marketing_carrier.iata_code}${seg.marketing_carrier_flight_number}`,
        origin: seg.origin.iata_code,
        destination: seg.destination.iata_code,
        departLocal,
        arriveLocal,
        originTz,
        destinationTz,
        durationMinutes: minutes,
      };
    });
    const layovers = segments.slice(1).map((seg, i) => ({
      airport: seg.origin,
      minutes: Math.round((localToUtc(seg.departLocal, seg.originTz).getTime() - localToUtc(segments[i].arriveLocal, segments[i].destinationTz).getTime()) / 60000),
    }));
    const first = segments[0];
    const last = segments[segments.length - 1];
    return {
      origin: first.origin,
      destination: last.destination,
      segments,
      stops: segments.length - 1,
      layovers,
      durationMinutes: Math.round((localToUtc(last.arriveLocal, last.destinationTz).getTime() - localToUtc(first.departLocal, first.originTz).getTime()) / 60000),
      departLocal: first.departLocal,
      arriveLocal: last.arriveLocal,
      dayShift: dayShift(first.departLocal, last.arriveLocal),
    };
  });
  const total = toCents(o.total_amount)!;
  const taxes = toCents(o.tax_amount);
  const base = toCents(o.base_amount);
  const bags = o.slices[0]?.segments[0]?.passengers?.[0]?.baggages ?? [];
  const checked = bags.find((b) => b.type === "checked")?.quantity ?? (bags.length ? 0 : null);
  const carry = bags.find((b) => b.type === "carry_on")?.quantity ?? null;
  const pax = params.adults + params.children;
  return {
    id: `duffel-${o.id}`,
    source,
    slices,
    validatingCarrier: o.owner.name,
    price: {
      currency: o.total_currency,
      ticketTotalCents: total,
      perPassengerCents: Math.round(total / pax),
      lines: [
        ...(base != null ? [{ label: "Tarif de base", cents: base, kind: "base" as const, included: true }] : []),
        ...(taxes != null ? [{ label: "Taxes et redevances", cents: taxes, kind: "taxes" as const, included: true }] : []),
      ],
      estimatedTotalCents: total,
      original: { cents: total, currency: o.total_currency },
    },
    baggage: { cabinBags: carry, checkedBags: checked, checkedBagFeeCents: null, note: checked === null ? "Bagages non précisés par la source" : undefined },
    conditions: {
      refundable: o.conditions?.refund_before_departure ? o.conditions.refund_before_departure.allowed : null,
      changeable: o.conditions?.change_before_departure ? o.conditions.change_before_departure.allowed : null,
    },
    booking: { type: "unavailable", label: "Réservation via DINO pas encore activée (tarif de référence Duffel)" },
    fetchedAt,
    expiresAt: o.expires_at,
    comparableKey: comparableFlightKey(params),
  };
}

export class DuffelFlightProvider implements FlightProvider {
  readonly id = "duffel";
  readonly name = "Duffel";
  readonly isDemo = false;
  readonly capabilities = { search: true, calendar: false, multiCity: true, freshness: "live" as const };
  /** Recherches facturées indirectement (ratio recherche/commande) : vérification d'alerte au plus toutes les 6 h. */
  readonly minCheckIntervalMinutes = 360;

  isConfigured() {
    return !!process.env.DUFFEL_API_TOKEN;
  }

  async search(params: FlightSearchParams, signal: AbortSignal): Promise<FlightOffer[]> {
    const token = process.env.DUFFEL_API_TOKEN;
    if (!token) throw new ProviderError(this.id, "non configuré");
    const passengers = [
      ...Array.from({ length: params.adults }, () => ({ type: "adult" })),
      ...Array.from({ length: params.children }, () => ({ age: 10 })),
    ];
    const body = {
      data: {
        slices: params.slices.map((s) => ({ origin: s.origin, destination: s.destination, departure_date: s.date })),
        passengers,
        cabin_class: CABIN_MAP[params.cabin],
        ...(params.maxStops !== undefined ? { max_connections: params.maxStops } : {}),
      },
    };
    const res = await fetchJson<{ data: { offers: DuffelOffer[] } }>(
      this.id,
      "https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=10000",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Duffel-Version": "v2",
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip",
        },
        body: JSON.stringify(body),
        signal,
        timeoutMs: 14000,
      },
    );
    const fetchedAt = new Date().toISOString();
    return (res.data?.offers ?? []).slice(0, 80).map((o) => mapDuffelOffer(o, params, fetchedAt));
  }
}
