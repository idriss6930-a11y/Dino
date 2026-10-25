/**
 * Registre des fournisseurs et choix du mode de données.
 *
 * DINO_DATA_MODE :
 *  - "auto" (défaut) : si au moins un fournisseur réel est configuré → mode "live", sinon → mode "demo" ;
 *  - "demo" : uniquement les fournisseurs synthétiques ;
 *  - "live" : uniquement les fournisseurs réels (résultats vides si aucune clé).
 * Les deux mondes ne sont JAMAIS mélangés dans une même réponse.
 */
import { DemoFlightProvider } from "./flights/demo";
import { DuffelFlightProvider } from "./flights/duffel";
import { TravelpayoutsFlightProvider } from "./flights/travelpayouts";
import { DemoHotelProvider } from "./hotels/demo";
import { LiteApiHotelProvider } from "./hotels/liteapi";
import type { FlightProvider, HotelProvider } from "./types";

const realFlights: FlightProvider[] = [new DuffelFlightProvider(), new TravelpayoutsFlightProvider()];
const demoFlights: FlightProvider[] = [new DemoFlightProvider()];
const realHotels: HotelProvider[] = [new LiteApiHotelProvider()];
const demoHotels: HotelProvider[] = [new DemoHotelProvider("demo"), new DemoHotelProvider("demo-b")];

export type DataMode = "live" | "demo";

export function flightDataMode(): DataMode {
  const m = process.env.DINO_DATA_MODE ?? "auto";
  if (m === "demo" || m === "live") return m;
  return realFlights.some((p) => p.isConfigured()) ? "live" : "demo";
}

export function hotelDataMode(): DataMode {
  const m = process.env.DINO_DATA_MODE ?? "auto";
  if (m === "demo" || m === "live") return m;
  return realHotels.some((p) => p.isConfigured()) ? "live" : "demo";
}

export function flightProviders(): FlightProvider[] {
  return flightDataMode() === "demo" ? demoFlights : realFlights;
}

export function hotelProviders(): HotelProvider[] {
  return hotelDataMode() === "demo" ? demoHotels : realHotels;
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Métadonnées publiques des sources (page « Sources & transparence », table data_sources). */
export const SOURCE_CATALOG = [
  { id: "demo", name: "DINO Démo A (synthétique)", kind: "demo", url: "/sources#demo", license: "Données générées par DINO", isDemo: true },
  { id: "demo-b", name: "DINO Démo B (synthétique)", kind: "demo", url: "/sources#demo", license: "Données générées par DINO", isDemo: true },
  { id: "duffel", name: "Duffel", kind: "flights", url: "https://duffel.com/docs", license: "Contrat Duffel", isDemo: false },
  { id: "travelpayouts", name: "Travelpayouts / Aviasales Data API", kind: "flights", url: "https://support.travelpayouts.com/hc/en-us/articles/203956163", license: "Conditions du programme d'affiliation Travelpayouts", isDemo: false },
  { id: "liteapi", name: "LiteAPI (Nuitee)", kind: "hotels", url: "https://docs.liteapi.travel", license: "Conditions LiteAPI", isDemo: false },
  { id: "open-meteo", name: "Open-Meteo (archives ERA5)", kind: "climate", url: "https://open-meteo.com", license: "CC BY 4.0", isDemo: false },
  { id: "frankfurter", name: "Frankfurter (taux de référence BCE)", kind: "fx", url: "https://frankfurter.dev", license: "Données BCE, usage libre", isDemo: false },
  { id: "editorial", name: "Rédaction DINO (estimations éditoriales)", kind: "editorial", url: "/sources#editorial", license: "DINO", isDemo: false },
  { id: "ourairports", name: "OurAirports", kind: "reference", url: "https://ourairports.com/data/", license: "Domaine public", isDemo: false },
  { id: "naturalearth", name: "Natural Earth", kind: "reference", url: "https://www.naturalearthdata.com", license: "Domaine public", isDemo: false },
  { id: "osm", name: "OpenStreetMap (fonds de carte)", kind: "maps", url: "https://www.openstreetmap.org/copyright", license: "ODbL", isDemo: false },
] as const;
