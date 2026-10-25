/** Sous-ensemble des types renvoyés par l'API DINO (voir src/lib/providers/types.ts du site). */
export type SourceRef = { id: string; name: string; isDemo: boolean; freshness: "live" | "cached" | "synthetic" };
export type BookingLink = { type: "affiliate_redirect" | "provider_redirect"; url: string; partner: string; label: string } | { type: "unavailable"; label: string };
export type PriceLine = { label: string; cents: number; included: boolean };

export type FlightSlice = { origin: string; destination: string; durationMinutes: number; stops: number; departLocal: string; arriveLocal: string; dayShift: number; segments: { carrierName: string }[] };
export type FlightOffer = {
  id: string;
  source: SourceRef;
  slices: FlightSlice[];
  price: { currency: string; ticketTotalCents: number; perPassengerCents: number; lines: PriceLine[]; estimatedTotalCents: number };
  booking: BookingLink;
};
export type FlightSearchResult = { mode: "live" | "demo"; currency: string; offers: FlightOffer[]; totalBeforeFilters: number; explanations: { sort: string }; warnings: string[]; providers: { name: string; status: string }[] };

export type HotelOffer = {
  id: string;
  source: SourceRef;
  property: { name: string; type: string; neighborhood: string | null; distanceToCenterKm: number; rating: { score: number; scale: number; count: number } | null };
  roomName: string;
  nights: number;
  price: { currency: string; totalCents: number; perNightCents: number; payAtPropertyCents: number; estimatedTotalCents: number };
  board: string;
  cancellation: { refundable: boolean | null; freeUntil: string | null };
  booking: BookingLink;
  valueScore: number | null;
  valueExplanation: string;
};
export type HotelSearchResult = { mode: "live" | "demo"; destination: { name: string }; nights: number; currency: string; offers: HotelOffer[]; warnings: string[] };

export type InspirationItem = {
  destination: { slug: string; name: { fr: string }; summary: string; hiddenGem: boolean };
  countryName: string;
  monthName: string;
  estimate: { perPersonCents: number; flightCents: number; stayCents: number; currency: string };
  climate: { tmax: number; precip: number };
  crowdLevel: 1 | 2 | 3;
  flightHours: number | null;
  reasons: string[];
  warnings: string[];
};
export type InspirationResult = { results: InspirationItem[]; nothingFits: boolean; disclaimer: string; monthLabel: string };

export type DestinationSummary = { slug: string; name: string; country: string; summary: string; tags: string[]; hiddenGem: boolean; airports: string[] };
export type MonthRow = { month: number; name: string; tmax: number; tmin: number; precip: number; weather: number; price: number; crowd: number; overall: number; pros: string[]; cons: string[] };
export type DestinationDetail = { destination: DestinationSummary; climateSource: { kind: string; label: string }; months: MonthRow[]; best: { overall: string[]; cheapAndQuiet: string; explanation: string } };

export type Place = { code: string; label: string; sub?: string };

export type AssistantReply = {
  mode: "ia" | "regles";
  text?: string;
  sections: { title: string; items: string[] }[];
  uncertainties: string[];
};

export type Me = { user: { displayName: string; email: string; handle: string } };
export type Alert = { id: string; name: string; kind: string; active: boolean; lastPriceCents: number | null; currency: string; lastCheckedAt: string | null };
export type Status = { flights: { mode: "live" | "demo" }; hotels: { mode: "live" | "demo" }; ai: boolean };
