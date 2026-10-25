/**
 * Contrats communs à tous les fournisseurs. Chaque connecteur convertit la réponse de sa source vers ces types :
 * le reste de l'application (comparaison, alertes, IA, interface) ne connaît jamais le format d'origine.
 * Remplacer un fournisseur = écrire un nouvel adaptateur qui respecte ces interfaces.
 */

export type Cabin = "economy" | "premium_economy" | "business" | "first";

export type SourceRef = {
  id: string;
  name: string;
  /** true = données synthétiques de démonstration. Jamais présentées comme réelles. */
  isDemo: boolean;
  /** Nature des prix : live = interrogation en temps réel ; cached = prix observés récemment par la source. */
  freshness: "live" | "cached" | "synthetic";
};

export type BookingLink =
  | { type: "affiliate_redirect"; url: string; partner: string; label: string }
  | { type: "provider_redirect"; url: string; partner: string; label: string }
  | { type: "unavailable"; label: string };

/* --------------------------------- Vols --------------------------------- */

export type FlightSliceQuery = { origin: string; destination: string; date: string };

export type FlightSearchParams = {
  slices: FlightSliceQuery[]; // 1 = aller simple, 2 = aller-retour (retour inversé), n = multi-destinations
  adults: number;
  children: number;
  cabin: Cabin;
  maxStops?: number;
  currency: string;
};

export type FlightSegment = {
  carrierCode: string;
  carrierName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departLocal: string; // "YYYY-MM-DDTHH:mm" heure locale de l'aéroport de départ
  arriveLocal: string;
  originTz: string;
  destinationTz: string;
  durationMinutes: number;
};

export type FlightSlice = {
  origin: string;
  destination: string;
  segments: FlightSegment[];
  durationMinutes: number;
  stops: number;
  layovers: { airport: string; minutes: number }[];
  departLocal: string;
  arriveLocal: string;
  /** Changement de jour à l'arrivée (+1 = arrivée le lendemain, heure locale). */
  dayShift: number;
};

export type PriceLine = { label: string; cents: number; kind: "base" | "taxes" | "fee" | "extra" | "estimate"; included: boolean };

export type FlightOffer = {
  id: string;
  source: SourceRef;
  /** Autres sources ayant renvoyé exactement le même itinéraire (après déduplication). */
  alsoFrom?: { source: SourceRef; totalCents: number; currency: string }[];
  slices: FlightSlice[];
  validatingCarrier: string;
  price: {
    currency: string;
    /** Prix du billet tel que renvoyé par la source, converti dans la devise d'affichage. */
    ticketTotalCents: number;
    perPassengerCents: number;
    lines: PriceLine[];
    /** Coût total estimé = billet + frais connus non inclus (ex. bagage soute demandé). */
    estimatedTotalCents: number;
    original: { cents: number; currency: string };
    fxRateNote?: string;
  };
  baggage: { cabinBags: number | null; checkedBags: number | null; checkedBagFeeCents: number | null; note?: string };
  conditions: { refundable: boolean | null; changeable: boolean | null; note?: string };
  booking: BookingLink;
  fetchedAt: string;
  expiresAt?: string;
  comparableKey: string;
};

export type FlightCalendarDay = { date: string; totalCents: number; currency: string; foundAt?: string; source: SourceRef };

export interface FlightProvider {
  readonly id: string;
  readonly name: string;
  readonly isDemo: boolean;
  readonly capabilities: { search: boolean; calendar: boolean; multiCity: boolean; freshness: SourceRef["freshness"] };
  /** Fréquence minimale raisonnable entre deux vérifications automatiques (alertes), en minutes. */
  readonly minCheckIntervalMinutes: number;
  isConfigured(): boolean;
  search(params: FlightSearchParams, signal: AbortSignal): Promise<FlightOffer[]>;
  calendar?(origin: string, destination: string, month: string, currency: string, signal: AbortSignal): Promise<FlightCalendarDay[]>;
}

/* -------------------------------- Hôtels -------------------------------- */

export type HotelSearchParams = {
  citySlug: string;
  lat: number;
  lon: number;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency: string;
};

export type PropertyType = "hotel" | "hostel" | "apartment" | "guesthouse";

export type HotelProperty = {
  externalId: string;
  name: string;
  type: PropertyType;
  lat: number;
  lon: number;
  stars: number | null;
  address: string | null;
  neighborhood: string | null;
  rating: { score: number; scale: number; count: number; sourceName: string } | null;
  amenities: string[];
};

export type HotelOffer = {
  id: string;
  source: SourceRef;
  property: HotelProperty & { canonicalId?: string; distanceToCenterKm: number };
  alsoFrom?: { source: SourceRef; totalCents: number; currency: string }[];
  roomName: string;
  nights: number;
  price: {
    currency: string;
    totalCents: number;
    perNightCents: number;
    /** Taxes/frais à payer sur place, connus mais non inclus. */
    payAtPropertyCents: number;
    lines: PriceLine[];
    estimatedTotalCents: number;
    original: { cents: number; currency: string };
  };
  board: "room_only" | "breakfast" | "half_board" | "full_board" | "unknown";
  cancellation: { refundable: boolean | null; freeUntil: string | null; note?: string };
  payment: "pay_now" | "pay_at_property" | "unknown";
  booking: BookingLink;
  fetchedAt: string;
  comparableKey: string;
};

export interface HotelProvider {
  readonly id: string;
  readonly name: string;
  readonly isDemo: boolean;
  readonly minCheckIntervalMinutes: number;
  isConfigured(): boolean;
  search(params: HotelSearchParams, signal: AbortSignal): Promise<HotelOffer[]>;
}

/* ------------------------ Statut d'interrogation ------------------------ */

export type ProviderRunStatus = {
  id: string;
  name: string;
  isDemo: boolean;
  status: "ok" | "empty" | "error" | "timeout" | "not_configured";
  count: number;
  ms: number;
  error?: string;
  checkedAt: string;
};

export class ProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly retriable = false,
  ) {
    super(message);
  }
}
