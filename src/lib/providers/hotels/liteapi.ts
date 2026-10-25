/**
 * Connecteur LiteAPI (Nuitee) — https://docs.liteapi.travel
 *
 * Variable : LITEAPI_KEY (clé « sandbox » gratuite ou clé de production). En-tête : X-API-Key.
 * Flux : 1) GET /data/hotels (liste d'établissements d'une ville) ; 2) POST /hotels/rates (tarifs).
 * - `retailRate.total` = montant à payer, incluant les taxes marquées `included: true` ;
 *   les `taxesAndFees` avec `included: false` sont à régler sur place → affichés séparément.
 * - `refundableTag` RFN/NRFN → remboursable ou non.
 * - Une clé sandbox renvoie des données de test : DINO les marque comme telles.
 * La réservation (prebook/book + paiement) n'est pas encore implémentée : pas de faux bouton.
 */
import { daysBetween } from "@/lib/utils/dates";
import { haversineKm } from "@/lib/utils/geo";
import { getDestination } from "@/data/destinations";
import { fetchJson } from "../http";
import type { HotelOffer, HotelProvider, HotelSearchParams, SourceRef } from "../types";
import { ProviderError } from "../types";
import { hotelComparableKey } from "./demo";

const BASE = "https://api.liteapi.travel/v3.0";

type LiteHotel = {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  hotelTypeId?: number;
  facilityIds?: number[];
};
type Money = { amount: number; currency: string };
type LiteRate = {
  name: string;
  boardType?: string;
  boardName?: string;
  retailRate: { total: Money[]; taxesAndFees?: { included: boolean; description?: string; amount: number; currency: string }[] | null };
  cancellationPolicies?: { refundableTag?: "RFN" | "NRFN"; cancelPolicyInfos?: { cancelTime: string }[] };
};
type LiteRates = { data: { hotelId: string; roomTypes: { offerId: string; rates: LiteRate[]; offerRetailRate?: Money }[] }[] };

function board(code?: string, name?: string): HotelOffer["board"] {
  const c = (code ?? "").toUpperCase();
  if (c === "RO") return "room_only";
  if (c === "BB" || /breakfast/i.test(name ?? "")) return "breakfast";
  if (c === "HB") return "half_board";
  if (c === "FB") return "full_board";
  return "unknown";
}

export function mapLiteApi(hotels: LiteHotel[], rates: LiteRates, p: HotelSearchParams, sandbox: boolean, fetchedAt: string): HotelOffer[] {
  const source: SourceRef = { id: "liteapi", name: sandbox ? "LiteAPI (sandbox, données de test)" : "LiteAPI", isDemo: sandbox, freshness: "live" };
  const byId = new Map(hotels.map((h) => [h.id, h]));
  const nights = daysBetween(p.checkin, p.checkout);
  const out: HotelOffer[] = [];
  for (const h of rates.data ?? []) {
    const info = byId.get(h.hotelId);
    if (!info || info.latitude == null || info.longitude == null) continue;
    // Offre la moins chère de l'établissement (les chambres plus chères restent disponibles chez le fournisseur).
    let best: { offerId: string; rate: LiteRate; total: Money } | null = null;
    for (const rt of h.roomTypes ?? []) {
      const rate = rt.rates?.[0];
      const total = rt.offerRetailRate ?? rate?.retailRate?.total?.[0];
      if (!rate || !total) continue;
      if (!best || total.amount < best.total.amount) best = { offerId: rt.offerId, rate, total };
    }
    if (!best) continue;
    const totalCents = Math.round(best.total.amount * 100);
    const excluded = (best.rate.retailRate.taxesAndFees ?? []).filter((t) => !t.included && t.currency === best!.total.currency);
    const payAtProperty = Math.round(excluded.reduce((a, t) => a + t.amount, 0) * 100);
    const tag = best.rate.cancellationPolicies?.refundableTag;
    out.push({
      id: `liteapi-${h.hotelId}-${best.offerId}`,
      source,
      property: {
        externalId: h.hotelId,
        name: info.name,
        type: "hotel",
        lat: info.latitude,
        lon: info.longitude,
        stars: info.stars ?? null,
        address: info.address ?? null,
        neighborhood: null,
        rating: info.rating ? { score: info.rating, scale: 10, count: info.reviewCount ?? 0, sourceName: "LiteAPI" } : null,
        amenities: [],
        distanceToCenterKm: Math.round(haversineKm(info.latitude, info.longitude, p.lat, p.lon) * 10) / 10,
      },
      roomName: best.rate.name,
      nights,
      price: {
        currency: best.total.currency,
        totalCents,
        perNightCents: Math.round(totalCents / Math.max(1, nights)),
        payAtPropertyCents: payAtProperty,
        lines: [
          { label: "Séjour (taxes incluses indiquées par la source)", cents: totalCents, kind: "base", included: true },
          ...excluded.map((t) => ({ label: `${t.description ?? "Taxe"} — à payer sur place`, cents: Math.round(t.amount * 100), kind: "fee" as const, included: false })),
        ],
        estimatedTotalCents: totalCents + payAtProperty,
        original: { cents: totalCents, currency: best.total.currency },
      },
      board: board(best.rate.boardType, best.rate.boardName),
      cancellation: {
        refundable: tag ? tag === "RFN" : null,
        freeUntil: best.rate.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime?.slice(0, 10) ?? null,
      },
      payment: "pay_now",
      booking: { type: "unavailable", label: "Réservation via DINO pas encore activée" },
      fetchedAt,
      comparableKey: hotelComparableKey(p),
    });
  }
  return out;
}

export class LiteApiHotelProvider implements HotelProvider {
  readonly id = "liteapi";
  readonly name = "LiteAPI";
  readonly isDemo = false;
  readonly minCheckIntervalMinutes = 360;

  isConfigured() {
    return !!process.env.LITEAPI_KEY;
  }

  async search(p: HotelSearchParams, signal: AbortSignal): Promise<HotelOffer[]> {
    const key = process.env.LITEAPI_KEY;
    if (!key) throw new ProviderError(this.id, "non configuré");
    const dest = getDestination(p.citySlug);
    if (!dest) return [];
    const headers = { "X-API-Key": key, Accept: "application/json", "Content-Type": "application/json" };
    const qs = new URLSearchParams({ countryCode: dest.countryIso, cityName: dest.name.en.split(/[ (&]/)[0], limit: "60" });
    const list = await fetchJson<{ data: LiteHotel[] }>(this.id, `${BASE}/data/hotels?${qs}`, { headers, signal, timeoutMs: 8000 });
    const hotels = list.data ?? [];
    if (!hotels.length) return [];
    const perRoom = Math.max(1, Math.ceil(p.adults / p.rooms));
    const rates = await fetchJson<LiteRates>(this.id, `${BASE}/hotels/rates`, {
      method: "POST",
      headers,
      signal,
      timeoutMs: 12000,
      body: JSON.stringify({
        hotelIds: hotels.map((h) => h.id),
        occupancies: Array.from({ length: p.rooms }, () => ({ adults: perRoom })),
        currency: p.currency,
        guestNationality: process.env.LITEAPI_GUEST_NATIONALITY ?? "FR",
        checkin: p.checkin,
        checkout: p.checkout,
      }),
    });
    return mapLiteApi(hotels, rates, p, key.startsWith("sand"), new Date().toISOString());
  }
}

