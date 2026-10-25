import airportsData from "@/data/geo/airports.json";
import { COUNTRIES, guessTimeZone } from "@/data/countries";
import { DESTINATIONS } from "@/data/destinations";
import { haversineKm } from "@/lib/utils/geo";

export type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  size: "L" | "M";
};

type Row = [string, string, string, string, number, number, "L" | "M"];

export const AIRPORTS: Airport[] = (airportsData.rows as Row[]).map(([iata, name, city, country, lat, lon, size]) => ({
  iata,
  name,
  city,
  country,
  lat,
  lon,
  size,
}));
const byIata = new Map(AIRPORTS.map((a) => [a.iata, a]));

/** Codes « ville » IATA regroupant plusieurs aéroports. */
export const METRO_CODES: Record<string, { name: string; airports: string[] }> = {
  PAR: { name: "Paris (tous les aéroports)", airports: ["CDG", "ORY", "BVA"] },
  LON: { name: "Londres (tous les aéroports)", airports: ["LHR", "LGW", "STN", "LTN", "LCY"] },
  NYC: { name: "New York (tous les aéroports)", airports: ["JFK", "EWR", "LGA"] },
  MIL: { name: "Milan (tous les aéroports)", airports: ["MXP", "LIN", "BGY"] },
  ROM: { name: "Rome (tous les aéroports)", airports: ["FCO", "CIA"] },
  TYO: { name: "Tokyo (tous les aéroports)", airports: ["HND", "NRT"] },
  OSA: { name: "Osaka (tous les aéroports)", airports: ["KIX", "ITM"] },
  BER: { name: "Berlin", airports: ["BER"] },
  STO: { name: "Stockholm (tous les aéroports)", airports: ["ARN", "BMA", "NYO"] },
  MOW: { name: "Moscou (tous les aéroports)", airports: ["SVO", "DME", "VKO"] },
  SEL: { name: "Séoul (tous les aéroports)", airports: ["ICN", "GMP"] },
  BKK: { name: "Bangkok (tous les aéroports)", airports: ["BKK", "DMK"] },
  RIO: { name: "Rio de Janeiro (tous les aéroports)", airports: ["GIG", "SDU"] },
  BUE: { name: "Buenos Aires (tous les aéroports)", airports: ["EZE", "AEP"] },
  YMQ: { name: "Montréal", airports: ["YUL"] },
  EAP: { name: "Bâle-Mulhouse", airports: ["BSL", "MLH"] },
};

export function getAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase());
}

/** Résout un code (aéroport ou ville) en liste d'aéroports. */
export function resolveAirports(code: string): string[] {
  const c = code.trim().toUpperCase();
  if (METRO_CODES[c]) return METRO_CODES[c].airports.filter((a) => byIata.has(a));
  if (byIata.has(c)) return [c];
  const dest = DESTINATIONS.find((d) => d.slug === code.trim().toLowerCase());
  if (dest) return dest.airports;
  return [];
}

export function airportTimeZone(iata: string): string {
  const dest = DESTINATIONS.find((d) => d.airports.includes(iata));
  if (dest) return dest.timeZone;
  const a = byIata.get(iata);
  if (!a) return "UTC";
  return guessTimeZone(a.country, a.lon);
}

export function airportLabel(code: string): string {
  const c = code.toUpperCase();
  if (METRO_CODES[c]) return METRO_CODES[c].name;
  const a = byIata.get(c);
  return a ? `${a.city || a.name} (${a.iata})` : c;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Noms français usuels → code. */
const FR_ALIASES: Record<string, string> = {
  paris: "PAR", londres: "LON", "new york": "NYC", milan: "MIL", rome: "ROM", tokyo: "TYO", seoul: "SEL",
  lisbonne: "LIS", barcelone: "BCN", seville: "SVQ", athenes: "ATH", venise: "VCE", florence: "FLR", naples: "NAP",
  geneve: "GVA", bale: "EAP", bruxelles: "BRU", lyon: "LYS", marseille: "MRS", nice: "NCE", toulouse: "TLS",
  bordeaux: "BOD", nantes: "NTE", lille: "LIL", strasbourg: "SXB", montpellier: "MPL", rennes: "RNS", biarritz: "BIQ",
  "le caire": "CAI", copenhague: "CPH", cracovie: "KRK", varsovie: "WAW", prague: "PRG", vienne: "VIE", munich: "MUC",
  francfort: "FRA", edimbourg: "EDI", dublin: "DUB", "mexico": "MEX", "le cap": "CPT", pekin: "PEK", singapour: "SIN",
  "montreal": "YUL", "pointe-a-pitre": "PTP", "fort-de-france": "FDF", "saint-denis": "RUN", "la reunion": "RUN",
  dubai: "DXB", "buenos aires": "BUE", "rio": "RIO", "marrakech": "RAK", "istanbul": "IST", "reykjavik": "KEF",
};

export type PlaceSuggestion = { code: string; label: string; sub: string; kind: "metro" | "airport" };

export function searchPlaces(query: string, limit = 8): PlaceSuggestion[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  const push = (s: PlaceSuggestion) => {
    if (!seen.has(s.code)) {
      seen.add(s.code);
      out.push(s);
    }
  };
  const alias = FR_ALIASES[q];
  if (alias) {
    if (METRO_CODES[alias]) push({ code: alias, label: METRO_CODES[alias].name, sub: METRO_CODES[alias].airports.join(", "), kind: "metro" });
    else if (byIata.has(alias)) {
      const a = byIata.get(alias)!;
      push({ code: a.iata, label: `${a.city} (${a.iata})`, sub: a.name, kind: "airport" });
    }
  }
  for (const [code, m] of Object.entries(METRO_CODES)) {
    if (code.toLowerCase() === q || norm(m.name).startsWith(q)) push({ code, label: m.name, sub: m.airports.join(", "), kind: "metro" });
  }
  const scored: { a: Airport; s: number }[] = [];
  for (const a of AIRPORTS) {
    let s = 0;
    if (a.iata.toLowerCase() === q) s = 100;
    else if (norm(a.city).startsWith(q)) s = 60;
    else if (norm(a.name).includes(q)) s = 30;
    else if (norm(a.city).includes(q)) s = 20;
    if (s > 0) scored.push({ a, s: s + (a.size === "L" ? 10 : 0) });
  }
  scored.sort((x, y) => y.s - x.s);
  for (const { a } of scored) {
    if (out.length >= limit) break;
    const country = COUNTRIES[a.country]?.fr ?? a.country;
    push({ code: a.iata, label: `${a.city || a.name} (${a.iata})`, sub: `${a.name} · ${country}`, kind: "airport" });
  }
  return out.slice(0, limit);
}

/** Aéroports proches (rayon en km), utiles pour comparer des alternatives moins chères. */
export function nearbyAirports(iata: string, radiusKm = 160): { airport: Airport; km: number }[] {
  const a = byIata.get(iata);
  if (!a) return [];
  return AIRPORTS.filter((b) => b.iata !== a.iata)
    .map((b) => ({ airport: b, km: haversineKm(a.lat, a.lon, b.lat, b.lon) }))
    .filter((x) => x.km <= radiusKm)
    .sort((x, y) => x.km - y.km)
    .slice(0, 6);
}

export function distanceKm(a: string, b: string): number | null {
  const x = byIata.get(a);
  const y = byIata.get(b);
  if (!x || !y) return null;
  return haversineKm(x.lat, x.lon, y.lat, y.lon);
}
