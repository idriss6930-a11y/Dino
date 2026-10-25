/**
 * Hébergements de DÉMONSTRATION — établissements FICTIFS aux noms explicitement inventés, prix et notes synthétiques.
 * Deux sources de démo (« A » et « B ») partagent une partie des établissements avec de légères différences de
 * nom, de coordonnées et de prix : cela permet de démontrer le rapprochement multi-fournisseurs.
 */
import { getDestination } from "@/data/destinations";
import { daysBetween, addDays, monthOf, todayIn, weekdayOf } from "@/lib/utils/dates";
import { haversineKm } from "@/lib/utils/geo";
import { seeded } from "@/lib/utils/rng";
import type { HotelOffer, HotelProperty, HotelProvider, HotelSearchParams, PropertyType, SourceRef } from "../types";

const NAMES: { name: string; type: PropertyType; stars: number | null }[] = [
  { name: "Hôtel du Petit Sauge", type: "hotel", stars: 3 },
  { name: "Auberge Le Fossile", type: "hostel", stars: null },
  { name: "Appartements Jurassique", type: "apartment", stars: null },
  { name: "Résidence Tricératops", type: "hotel", stars: 4 },
  { name: "Ptéro Hostel", type: "hostel", stars: null },
  { name: "Maison Diplodocus", type: "guesthouse", stars: null },
  { name: "Hôtel Ambre & Fougère", type: "hotel", stars: 4 },
  { name: "Le Nid du Raptor", type: "guesthouse", stars: null },
  { name: "Grand Hôtel Crétacé", type: "hotel", stars: 5 },
  { name: "Hôtel de la Comète", type: "hotel", stars: 2 },
  { name: "Studios Stégosaure", type: "apartment", stars: null },
  { name: "Palais Brachio", type: "hotel", stars: 5 },
  { name: "Hôtel Mosaïque Verte", type: "hotel", stars: 3 },
  { name: "Casa Ammonite", type: "guesthouse", stars: null },
  { name: "Hôtel des Volcans Doux", type: "hotel", stars: 3 },
  { name: "Loft Iguanodon", type: "apartment", stars: null },
];
const NEIGHBORHOODS = ["Centre historique", "Quartier de la gare", "Bord de l'eau", "Quartier animé", "Quartier résidentiel calme", "Près des musées"];
const AMENITIES = ["Wi-Fi", "Climatisation", "Petit-déjeuner disponible", "Cuisine", "Ascenseur", "Accès PMR", "Parking", "Piscine", "Salle de sport", "Lave-linge", "Animaux acceptés", "Réception 24 h/24"];

const SOURCES: Record<"demo" | "demo-b", SourceRef> = {
  demo: { id: "demo", name: "DINO Démo A (données synthétiques)", isDemo: true, freshness: "synthetic" },
  "demo-b": { id: "demo-b", name: "DINO Démo B (données synthétiques)", isDemo: true, freshness: "synthetic" },
};

export function hotelComparableKey(p: HotelSearchParams) {
  return `${p.citySlug}|${p.checkin}|${p.checkout}|${p.adults}a|${p.rooms}r`;
}

export class DemoHotelProvider implements HotelProvider {
  readonly isDemo = true;
  readonly minCheckIntervalMinutes = 60;
  readonly id: "demo" | "demo-b";
  readonly name: string;

  constructor(
    variant: "demo" | "demo-b" = "demo",
    private readonly now: () => Date = () => new Date(),
  ) {
    this.id = variant;
    this.name = SOURCES[variant].name;
  }

  isConfigured() {
    return true;
  }

  async search(p: HotelSearchParams): Promise<HotelOffer[]> {
    const dest = getDestination(p.citySlug);
    if (!dest) return [];
    const nights = daysBetween(p.checkin, p.checkout);
    if (nights < 1) return [];
    const source = SOURCES[this.id];
    const isB = this.id === "demo-b";
    const observed = todayIn("Europe/Paris", this.now());
    const offers: HotelOffer[] = [];
    NAMES.forEach((n, idx) => {
      const r = seeded(`${dest.slug}|${idx}`);
      // La source B ne connaît qu'une partie des établissements.
      if (isB && idx % 3 === 1) return;
      const angle = r.next() * Math.PI * 2;
      const distKm = 0.2 + r.next() * 3.8;
      const lat = dest.lat + (Math.cos(angle) * distKm) / 111 + (isB ? 0.0004 : 0);
      const lon = dest.lon + (Math.sin(angle) * distKm) / (111 * Math.cos((dest.lat * Math.PI) / 180));
      const quality = n.stars ?? (n.type === "hostel" ? 2 : 3);
      const typeF = n.type === "hostel" ? 0.38 : n.type === "apartment" ? 1.05 : n.type === "guesthouse" ? 0.8 : 1;
      const starF = n.stars ? [0.55, 0.65, 0.85, 1.25, 2.1][n.stars - 1] : 1;
      const centerF = 1.15 - distKm * 0.06;
      const score = Math.min(9.7, Math.round((6.4 + quality * 0.55 + r.next() * 1.4) * 10) / 10);
      const count = 40 + Math.floor(r.next() * 2400);
      let totalCents = 0;
      for (let i = 0; i < nights; i++) {
        const day = addDays(p.checkin, i);
        const wd = weekdayOf(day);
        const season = dest.priceIndex[monthOf(day) - 1];
        const weekend = wd === 5 || wd === 6 ? 1.12 : 1;
        const drift = 1 + 0.05 * seeded(`${dest.slug}|${idx}|${day}|${observed}|${this.id}`).normal();
        const perRoom = dest.costs[0] * typeF * starF * centerF * season * weekend * drift * (isB ? 1.03 : 1);
        totalCents += Math.round(perRoom * 100);
      }
      totalCents *= p.rooms;
      const cityTax = n.type === "hostel" ? 0 : Math.round(150 * nights * p.adults * (n.stars ?? 2) * 0.5);
      const breakfast = r.next() < 0.45;
      const refundable = r.next() < 0.6;
      const amenities = AMENITIES.filter(() => r.next() < 0.45);
      if (n.type === "apartment" && !amenities.includes("Cuisine")) amenities.push("Cuisine");
      const property: HotelProperty = {
        externalId: `${dest.slug}-${idx}`,
        name: isB ? n.name.replace("Hôtel", "Hotel").replace("&", "et") : n.name,
        type: n.type,
        lat,
        lon,
        stars: n.stars,
        address: null,
        neighborhood: NEIGHBORHOODS[idx % NEIGHBORHOODS.length],
        rating: { score, scale: 10, count, sourceName: "Note synthétique (démo)" },
        amenities,
      };
      const freeUntil = refundable ? addDays(p.checkin, -2) : null;
      offers.push({
        id: `${this.id}-${dest.slug}-${idx}-${p.checkin}-${p.checkout}`,
        source,
        property: { ...property, distanceToCenterKm: Math.round(haversineKm(lat, lon, dest.lat, dest.lon) * 10) / 10 },
        roomName: n.type === "hostel" ? "Lit en dortoir mixte" : n.type === "apartment" ? "Appartement entier" : "Chambre double standard",
        nights,
        price: {
          currency: "EUR",
          totalCents,
          perNightCents: Math.round(totalCents / nights),
          payAtPropertyCents: cityTax,
          lines: [
            { label: "Séjour (taxes de séjour non comprises)", cents: totalCents, kind: "base", included: true },
            ...(cityTax ? [{ label: "Taxe de séjour à payer sur place (estimation)", cents: cityTax, kind: "fee" as const, included: false }] : []),
          ],
          estimatedTotalCents: totalCents + cityTax,
          original: { cents: totalCents, currency: "EUR" },
        },
        board: breakfast ? "breakfast" : "room_only",
        cancellation: { refundable, freeUntil, note: refundable ? `Annulation gratuite jusqu'au ${freeUntil} (démo)` : "Non remboursable (démo)" },
        payment: refundable ? "pay_at_property" : "pay_now",
        booking: { type: "unavailable", label: "Démo : aucune réservation possible" },
        fetchedAt: this.now().toISOString(),
        comparableKey: hotelComparableKey(p),
      });
    });
    return offers;
  }
}
