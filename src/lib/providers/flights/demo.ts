/**
 * Fournisseur de DÉMONSTRATION — données 100 % synthétiques.
 *
 * - Compagnies FICTIVES (« Dino Air », « Sauge Airlines »…) pour qu'aucun tarif inventé ne soit attribué à une
 *   vraie compagnie.
 * - Modèle de prix déterministe (distance, saison éditoriale, délai de réservation, jour de la semaine, bruit
 *   pseudo-aléatoire stable) : permet de tester toute l'application (comparaison, calendrier, historique, alertes)
 *   sans clé d'API.
 * - Chaque offre porte source.isDemo = true et l'interface affiche un badge « Démo ».
 */
import { DESTINATIONS } from "@/data/destinations";
import { addDays, daysBetween, localToUtc, monthOf, todayIn, utcToLocal, weekdayOf, dayShift } from "@/lib/utils/dates";
import { hashString, seeded } from "@/lib/utils/rng";
import { airportTimeZone, distanceKm, getAirport } from "@/lib/services/airports";
import { haversineKm } from "@/lib/utils/geo";
import type {
  Cabin,
  FlightCalendarDay,
  FlightOffer,
  FlightProvider,
  FlightSearchParams,
  FlightSegment,
  FlightSlice,
  SourceRef,
} from "../types";

export const DEMO_SOURCE: SourceRef = { id: "demo", name: "DINO Démo (données synthétiques)", isDemo: true, freshness: "synthetic" };

const CARRIERS = [
  { code: "D1", name: "Dino Air (fictive)", factor: 0.92, hubs: ["MAD", "LIS"] },
  { code: "S2", name: "Sauge Airlines (fictive)", factor: 1.04, hubs: ["AMS", "FRA"] },
  { code: "P3", name: "Ptéro Express (fictive)", factor: 0.82, hubs: ["BGY", "BUD"] },
  { code: "T4", name: "Tricératops Jet (fictive)", factor: 1.12, hubs: ["IST", "DOH"] },
  { code: "R5", name: "Raptor Connect (fictive)", factor: 0.97, hubs: ["DXB", "CDG"] },
] as const;

const CABIN_FACTOR: Record<Cabin, number> = { economy: 1, premium_economy: 1.75, business: 3.6, first: 6.2 };
const DEPART_TIMES = ["06:10", "07:35", "09:45", "11:20", "13:05", "15:40", "17:25", "19:50", "21:35"];

function seasonFactor(destination: string, travelDate: string): number {
  const dest = DESTINATIONS.find((d) => d.airports.includes(destination));
  const m = monthOf(travelDate);
  let f = dest ? dest.priceIndex[m - 1] : 1;
  // Vacances scolaires européennes typiques : légère hausse (estimation du modèle de démo).
  const md = travelDate.slice(5);
  if ((md >= "07-05" && md <= "08-25") || md >= "12-19" || md <= "01-03") f *= 1.1;
  return f;
}

function leadFactor(lead: number): number {
  if (lead < 7) return 1.55;
  if (lead < 14) return 1.3;
  if (lead < 30) return 1.12;
  if (lead < 60) return 1.0;
  if (lead < 120) return 0.95;
  if (lead < 240) return 1.0;
  return 1.08;
}

function weekdayFactor(date: string): number {
  const wd = weekdayOf(date);
  return wd === 5 || wd === 0 ? 1.12 : wd === 2 || wd === 3 ? 0.92 : 1;
}

/** Variation quotidienne pseudo-aléatoire mais stable : simule l'évolution d'un tarif au fil des jours d'observation. */
function dailyDrift(key: string, observedDate: string): number {
  const dayIndex = Math.floor(Date.UTC(+observedDate.slice(0, 4), +observedDate.slice(5, 7) - 1, +observedDate.slice(8, 10)) / 86400000);
  const phase = (hashString(key) % 628) / 100;
  const r = seeded(`${key}|${observedDate}`);
  return 1 + 0.07 * Math.sin(dayIndex / 9 + phase) + 0.035 * r.normal();
}

/** Prix synthétique d'un aller simple en centimes d'EUR. Exporté pour le calendrier et l'historique de démonstration. */
export function demoFareCents(opts: {
  origin: string;
  destination: string;
  travelDate: string;
  observedDate: string;
  cabin: Cabin;
  carrierIndex?: number;
  stops?: number;
}): number {
  const km = distanceKm(opts.origin, opts.destination) ?? 1500;
  const base = 30 + 0.09 * Math.pow(km, 0.93);
  const carrier = CARRIERS[(opts.carrierIndex ?? 0) % CARRIERS.length];
  const stopsF = opts.stops === undefined ? 1 : opts.stops === 0 ? 1.12 : opts.stops === 1 ? 0.94 : 0.86;
  const lead = Math.max(0, daysBetween(opts.observedDate, opts.travelDate));
  const key = `${opts.origin}-${opts.destination}|${opts.travelDate}|${carrier.code}`;
  const eur =
    base *
    seasonFactor(opts.destination, opts.travelDate) *
    leadFactor(lead) *
    weekdayFactor(opts.travelDate) *
    CABIN_FACTOR[opts.cabin] *
    carrier.factor *
    stopsF *
    dailyDrift(key, opts.observedDate);
  return Math.max(1900, Math.round(eur) * 100 - 1); // prix « psychologiques » en ,99
}

function pickHub(origin: string, destination: string, carrierIdx: number): string | null {
  const o = getAirport(origin);
  const d = getAirport(destination);
  if (!o || !d) return null;
  const midLat = (o.lat + d.lat) / 2;
  const midLon = (o.lon + d.lon) / 2;
  const candidates = [...CARRIERS[carrierIdx].hubs, "IST", "FRA", "AMS", "MAD", "DOH", "DXB", "SIN", "LHR", "JFK", "GRU", "ADD", "NBO", "BKK"]
    .filter((h, i, arr) => arr.indexOf(h) === i && h !== origin && h !== destination)
    .map((h) => getAirport(h))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((h) => ({ h, detour: haversineKm(o.lat, o.lon, h.lat, h.lon) + haversineKm(h.lat, h.lon, d.lat, d.lon) - haversineKm(o.lat, o.lon, d.lat, d.lon), mid: haversineKm(midLat, midLon, h.lat, h.lon) }))
    .sort((a, b) => a.detour - b.detour);
  return candidates[0]?.detour < 2500 ? candidates[0].h.iata : null;
}

function flightMinutes(a: string, b: string): number {
  const km = distanceKm(a, b) ?? 1500;
  return Math.round((km / 790) * 60 + 35);
}

function buildSegment(carrierIdx: number, from: string, to: string, departLocal: string, seed: number): FlightSegment {
  const c = CARRIERS[carrierIdx];
  const originTz = airportTimeZone(from);
  const destinationTz = airportTimeZone(to);
  const duration = flightMinutes(from, to);
  const departUtc = localToUtc(departLocal, originTz);
  const arriveUtc = new Date(departUtc.getTime() + duration * 60000);
  return {
    carrierCode: c.code,
    carrierName: c.name,
    flightNumber: `${c.code}${100 + (seed % 900)}`,
    origin: from,
    destination: to,
    departLocal,
    arriveLocal: utcToLocal(arriveUtc, destinationTz),
    originTz,
    destinationTz,
    durationMinutes: duration,
  };
}

function buildSlice(carrierIdx: number, origin: string, destination: string, date: string, stops: number, timeIdx: number, seed: number): FlightSlice | null {
  const departLocal = `${date}T${DEPART_TIMES[timeIdx % DEPART_TIMES.length]}`;
  const segments: FlightSegment[] = [];
  const layovers: FlightSlice["layovers"] = [];
  if (stops === 0) {
    segments.push(buildSegment(carrierIdx, origin, destination, departLocal, seed));
  } else {
    const hub = pickHub(origin, destination, carrierIdx);
    if (!hub) return null;
    const s1 = buildSegment(carrierIdx, origin, hub, departLocal, seed);
    const layover = 55 + ((seed >> 3) % 6) * 35;
    const s1ArriveUtc = localToUtc(s1.arriveLocal, s1.destinationTz);
    const s2DepartUtc = new Date(s1ArriveUtc.getTime() + layover * 60000);
    const s2 = buildSegment(carrierIdx, hub, destination, utcToLocal(s2DepartUtc, airportTimeZone(hub)), seed + 7);
    segments.push(s1, s2);
    layovers.push({ airport: hub, minutes: layover });
  }
  const first = segments[0];
  const last = segments[segments.length - 1];
  const totalMinutes = Math.round(
    (localToUtc(last.arriveLocal, last.destinationTz).getTime() - localToUtc(first.departLocal, first.originTz).getTime()) / 60000,
  );
  return {
    origin,
    destination,
    segments,
    durationMinutes: totalMinutes,
    stops: segments.length - 1,
    layovers,
    departLocal: first.departLocal,
    arriveLocal: last.arriveLocal,
    dayShift: dayShift(first.departLocal, last.arriveLocal),
  };
}

const FARES = [
  { name: "Basic", cabinBags: 1, checkedBags: 0, bagFee: 45, refundable: false, changeable: false, mult: 1 },
  { name: "Standard", cabinBags: 1, checkedBags: 1, bagFee: 0, refundable: false, changeable: true, mult: 1.18 },
  { name: "Flex", cabinBags: 1, checkedBags: 1, bagFee: 0, refundable: true, changeable: true, mult: 1.45 },
];

export function comparableFlightKey(p: FlightSearchParams): string {
  return [p.slices.map((s) => `${s.origin}-${s.destination}@${s.date}`).join(","), p.cabin, `${p.adults}a${p.children}c`].join("|");
}

export class DemoFlightProvider implements FlightProvider {
  readonly id = "demo";
  readonly name = DEMO_SOURCE.name;
  readonly isDemo = true;
  readonly capabilities = { search: true, calendar: true, multiCity: true, freshness: "synthetic" as const };
  readonly minCheckIntervalMinutes = 60;

  constructor(private readonly now: () => Date = () => new Date()) {}

  isConfigured() {
    return true;
  }

  async search(params: FlightSearchParams, _signal?: AbortSignal): Promise<FlightOffer[]> {
    const observedDate = todayIn("Europe/Paris", this.now());
    const pax = params.adults + params.children;
    const offers: FlightOffer[] = [];
    const known = params.slices.every((s) => getAirport(s.origin) && getAirport(s.destination));
    if (!known) return [];

    for (let ci = 0; ci < CARRIERS.length; ci++) {
      for (let variant = 0; variant < 3; variant++) {
        const seed = hashString(`${comparableFlightKey(params)}|${ci}|${variant}`);
        const r = seeded(seed);
        // Probabilité de vol direct décroissante avec la distance.
        const slices: FlightSlice[] = [];
        let fareEur = 0;
        let ok = true;
        for (const [si, s] of params.slices.entries()) {
          const km = distanceKm(s.origin, s.destination) ?? 1500;
          const directPossible = km < 4500 ? r.next() < 0.75 : km < 9000 ? r.next() < 0.35 : r.next() < 0.12;
          const stops = variant === 0 && directPossible ? 0 : variant === 2 && km > 2500 ? 1 : directPossible && r.next() < 0.5 ? 0 : 1;
          if (params.maxStops !== undefined && stops > params.maxStops) {
            ok = false;
            break;
          }
          const slice = buildSlice(ci, s.origin, s.destination, s.date, stops, (ci * 2 + variant * 3 + si * 5) % DEPART_TIMES.length, seed + si * 13);
          if (!slice) {
            ok = false;
            break;
          }
          slices.push(slice);
          fareEur += demoFareCents({ origin: s.origin, destination: s.destination, travelDate: s.date, observedDate, cabin: params.cabin, carrierIndex: ci, stops });
        }
        if (!ok) continue;
        const fare = FARES[variant];
        const perPax = Math.round((fareEur * fare.mult) / 100) * 100 - 1;
        const childFactor = 0.85;
        const ticketTotal = Math.round(perPax * params.adults + perPax * childFactor * params.children);
        const taxes = Math.round(ticketTotal * 0.24);
        const bagFeeTotal = fare.bagFee * 100 * pax * params.slices.length;
        offers.push({
          id: `demo-${seed.toString(36)}`,
          source: DEMO_SOURCE,
          slices,
          validatingCarrier: CARRIERS[ci].name,
          price: {
            currency: "EUR",
            ticketTotalCents: ticketTotal,
            perPassengerCents: Math.round(ticketTotal / pax),
            lines: [
              { label: "Tarif de base", cents: ticketTotal - taxes, kind: "base", included: true },
              { label: "Taxes et redevances", cents: taxes, kind: "taxes", included: true },
              ...(fare.bagFee
                ? [{ label: `Bagage en soute (${pax} × ${params.slices.length} trajet(s), frais connus)`, cents: bagFeeTotal, kind: "fee" as const, included: false }]
                : []),
            ],
            estimatedTotalCents: ticketTotal,
            original: { cents: ticketTotal, currency: "EUR" },
          },
          baggage: {
            cabinBags: fare.cabinBags,
            checkedBags: fare.checkedBags,
            checkedBagFeeCents: fare.bagFee ? fare.bagFee * 100 : null,
            note: `Tarif ${fare.name}`,
          },
          conditions: {
            refundable: fare.refundable,
            changeable: fare.changeable,
            note: fare.refundable ? "Remboursable (démo)" : fare.changeable ? "Modifiable avec frais (démo)" : "Ni modifiable ni remboursable (démo)",
          },
          booking: { type: "unavailable", label: "Démo : aucune réservation possible" },
          fetchedAt: this.now().toISOString(),
          comparableKey: comparableFlightKey(params),
        });
      }
    }
    return offers;
  }

  async calendar(origin: string, destination: string, month: string): Promise<FlightCalendarDay[]> {
    const observedDate = todayIn("Europe/Paris", this.now());
    const out: FlightCalendarDay[] = [];
    const start = `${month}-01`;
    for (let i = 0; i < 31; i++) {
      const date = addDays(start, i);
      if (date.slice(0, 7) !== month) break;
      if (daysBetween(observedDate, date) < 1) continue;
      const prices = [0, 2, 4].map((ci) => demoFareCents({ origin, destination, travelDate: date, observedDate, cabin: "economy", carrierIndex: ci, stops: 1 }));
      out.push({ date, totalCents: Math.min(...prices), currency: "EUR", source: DEMO_SOURCE });
    }
    return out;
  }
}

