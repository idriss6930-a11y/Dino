/**
 * Connecteur Travelpayouts / Aviasales Data API (https://support.travelpayouts.com/hc/en-us/articles/203956163).
 *
 * Variables : TRAVELPAYOUTS_TOKEN (obligatoire), TRAVELPAYOUTS_MARKER (identifiant d'affiliation pour les liens).
 * Limites documentées par la source :
 * - prix issus d'un CACHE construit à partir des recherches des utilisateurs d'Aviasales (pas une recherche en
 *   direct). `prices_for_dates` ne contient que des billets trouvés au cours des 48 dernières heures ;
 * - couverture variable selon les marchés ; pas de détail des escales ni des bagages ;
 * - la réservation se fait chez le partenaire via un lien affilié, signalé comme tel.
 * DINO affiche ces prix comme « observés récemment, à confirmer ».
 */
import { dayShift, utcToLocal } from "@/lib/utils/dates";
import { airportTimeZone } from "@/lib/services/airports";
import { fetchJson } from "../http";
import type { FlightCalendarDay, FlightOffer, FlightProvider, FlightSearchParams, SourceRef } from "../types";
import { ProviderError } from "../types";
import { comparableFlightKey } from "./demo";

const SOURCE: SourceRef = { id: "travelpayouts", name: "Aviasales via Travelpayouts (prix en cache)", isDemo: false, freshness: "cached" };

type TpRow = {
  origin: string;
  destination: string;
  origin_airport: string;
  destination_airport: string;
  price: number;
  airline: string;
  flight_number: string | number;
  departure_at: string; // ISO avec décalage
  return_at?: string;
  transfers: number;
  return_transfers?: number;
  duration_to?: number;
  duration_back?: number;
  link: string;
};

function sliceFrom(origin: string, destination: string, departIso: string, minutes: number, transfers: number, airline: string, flightNumber: string) {
  const originTz = airportTimeZone(origin);
  const destinationTz = airportTimeZone(destination);
  const departUtc = new Date(departIso);
  const departLocal = utcToLocal(departUtc, originTz);
  const arriveLocal = utcToLocal(new Date(departUtc.getTime() + minutes * 60000), destinationTz);
  return {
    origin,
    destination,
    segments: [
      { carrierCode: airline, carrierName: airline, flightNumber: `${airline}${flightNumber}`, origin, destination, departLocal, arriveLocal, originTz, destinationTz, durationMinutes: minutes },
    ],
    durationMinutes: minutes,
    stops: transfers,
    layovers: [],
    departLocal,
    arriveLocal,
    dayShift: dayShift(departLocal, arriveLocal),
  };
}

export function mapTravelpayoutsRow(r: TpRow, params: FlightSearchParams, currency: string, fetchedAt: string): FlightOffer | null {
  const pax = params.adults + params.children;
  const total = Math.round(r.price * 100) * pax; // la source renvoie un prix par adulte
  const out = sliceFrom(r.origin_airport, r.destination_airport, r.departure_at, r.duration_to ?? 0, r.transfers, r.airline, String(r.flight_number));
  const slices = [out];
  if (params.slices.length === 2 && r.return_at) {
    slices.push(sliceFrom(r.destination_airport, r.origin_airport, r.return_at, r.duration_back ?? 0, r.return_transfers ?? 0, r.airline, String(r.flight_number)));
  }
  const marker = process.env.TRAVELPAYOUTS_MARKER;
  const url = `https://www.aviasales.com${r.link}${marker ? `${r.link.includes("?") ? "&" : "?"}marker=${encodeURIComponent(marker)}` : ""}`;
  return {
    id: `tp-${r.origin_airport}${r.destination_airport}-${r.departure_at}-${r.airline}${r.flight_number}`,
    source: SOURCE,
    slices,
    validatingCarrier: r.airline,
    price: {
      currency,
      ticketTotalCents: total,
      perPassengerCents: Math.round(r.price * 100),
      lines: [{ label: "Prix observé (taxes incluses, estimation par adulte × voyageurs)", cents: total, kind: "estimate", included: true }],
      estimatedTotalCents: total,
      original: { cents: total, currency },
    },
    baggage: { cabinBags: null, checkedBags: null, checkedBagFeeCents: null, note: "Bagages non précisés par la source" },
    conditions: { refundable: null, changeable: null, note: "Conditions affichées chez le partenaire" },
    booking: { type: "affiliate_redirect", url, partner: "Aviasales", label: "Voir chez Aviasales (lien partenaire)" },
    fetchedAt,
    comparableKey: comparableFlightKey(params),
  };
}

export class TravelpayoutsFlightProvider implements FlightProvider {
  readonly id = "travelpayouts";
  readonly name = SOURCE.name;
  readonly isDemo = false;
  readonly capabilities = { search: true, calendar: true, multiCity: false, freshness: "cached" as const };
  readonly minCheckIntervalMinutes = 180;

  isConfigured() {
    return !!process.env.TRAVELPAYOUTS_TOKEN;
  }

  private headers() {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    if (!token) throw new ProviderError(this.id, "non configuré");
    return { "X-Access-Token": token, "Accept-Encoding": "gzip, deflate" };
  }

  async search(params: FlightSearchParams, signal: AbortSignal): Promise<FlightOffer[]> {
    if (params.slices.length > 2) return []; // multi-destinations non pris en charge par la source
    const [out, back] = params.slices;
    const currency = params.currency.toLowerCase();
    const qs = new URLSearchParams({
      origin: out.origin,
      destination: out.destination,
      departure_at: out.date,
      one_way: back ? "false" : "true",
      direct: params.maxStops === 0 ? "true" : "false",
      sorting: "price",
      currency,
      limit: "30",
      page: "1",
    });
    if (back) qs.set("return_at", back.date);
    const res = await fetchJson<{ success: boolean; data: TpRow[] }>(this.id, `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${qs}`, {
      headers: this.headers(),
      signal,
      timeoutMs: 6000,
    });
    if (!res.success) throw new ProviderError(this.id, "réponse invalide");
    const fetchedAt = new Date().toISOString();
    return res.data
      .filter((r) => params.maxStops === undefined || r.transfers <= params.maxStops)
      .map((r) => mapTravelpayoutsRow(r, params, params.currency, fetchedAt))
      .filter((x): x is FlightOffer => !!x);
  }

  async calendar(origin: string, destination: string, month: string, currency: string, signal: AbortSignal): Promise<FlightCalendarDay[]> {
    const qs = new URLSearchParams({ origin, destination, month: `${month}-01`, currency: currency.toLowerCase(), show_to_affiliates: "true", limit: "31" });
    const res = await fetchJson<{ success: boolean; data: { depart_date: string; value: number; found_at: string }[] }>(
      this.id,
      `https://api.travelpayouts.com/v2/prices/month-matrix?${qs}`,
      { headers: this.headers(), signal, timeoutMs: 6000 },
    );
    return (res.data ?? []).map((r) => ({ date: r.depart_date, totalCents: Math.round(r.value * 100), currency, foundAt: r.found_at, source: SOURCE }));
  }
}

