import { describe, expect, it } from "vitest";
import { isSameProperty, mergeHotelOffers, nameSimilarity, rankValue } from "@/lib/services/hotel-search";
import { mapLiteApi } from "@/lib/providers/hotels/liteapi";
import type { HotelOffer } from "@/lib/providers/types";

function h(id: string, name: string, lat: number, lon: number, total: number, source = "a", rating: { score: number; count: number } | null = { score: 8.5, count: 500 }): HotelOffer {
  return {
    id,
    source: { id: source, name: source, isDemo: true, freshness: "synthetic" },
    property: { externalId: id, name, type: "hotel", lat, lon, stars: 3, address: null, neighborhood: null, rating: rating ? { ...rating, scale: 10, sourceName: "t" } : null, amenities: [], distanceToCenterKm: 1 },
    roomName: "Double",
    nights: 2,
    price: { currency: "EUR", totalCents: total, perNightCents: total / 2, payAtPropertyCents: 0, lines: [], estimatedTotalCents: total, original: { cents: total, currency: "EUR" } },
    board: "room_only",
    cancellation: { refundable: true, freeUntil: null },
    payment: "pay_now",
    booking: { type: "unavailable", label: "x" },
    fetchedAt: "",
    comparableKey: id,
  };
}

describe("rapprochement des hôtels entre fournisseurs", () => {
  it("reconnaît le même établissement malgré une variation de nom", () => {
    expect(nameSimilarity("Hotel Le Fossile", "Le Fossile Hôtel")).toBeGreaterThanOrEqual(0.6);
    expect(isSameProperty(h("1", "Hotel Le Fossile", 38.71, -9.14, 1).property, h("2", "Le Fossile Hôtel", 38.7104, -9.14, 1).property)).toBe(true);
  });
  it("ne confond pas deux hôtels voisins aux noms différents", () => {
    expect(isSameProperty(h("1", "Hotel Atlantico", 38.71, -9.14, 1).property, h("2", "Casa do Rio", 38.7101, -9.14, 1).property)).toBe(false);
  });
  it("ne confond pas deux hôtels homonymes éloignés", () => {
    expect(isSameProperty(h("1", "Hotel Central", 38.71, -9.14, 1).property, h("2", "Hotel Central", 38.75, -9.14, 1).property)).toBe(false);
  });
  it("fusionne et garde l'offre la moins chère avec les alternatives", () => {
    const out = mergeHotelOffers([h("1", "Hotel Le Fossile", 38.71, -9.14, 30000, "a"), h("2", "Le Fossile Hotel", 38.7101, -9.14, 28000, "b")]);
    expect(out).toHaveLength(1);
    expect(out[0].price.totalCents).toBe(28000);
    expect(out[0].alsoFrom?.[0].totalCents).toBe(30000);
  });
});

describe("rapport qualité-prix", () => {
  it("favorise une meilleure note à prix égal et ne note pas sans avis suffisants", () => {
    const r = rankValue([h("good", "A", 0, 0, 20000, "a", { score: 9.2, count: 900 }), h("meh", "B", 0, 1, 20000, "a", { score: 7.0, count: 900 }), h("none", "C", 1, 0, 20000, "a", null)]);
    const by = Object.fromEntries(r.map((x) => [x.id, x.valueScore]));
    expect(by.good!).toBeGreaterThan(by.meh!);
    expect(by.none).toBeNull();
  });
});

describe("adaptateur LiteAPI (réponse d'exemple)", () => {
  it("sépare taxes incluses et taxes à payer sur place, marque le sandbox", () => {
    const offers = mapLiteApi(
      [{ id: "lp1", name: "Hotel Exemplo", latitude: 38.712, longitude: -9.139, stars: 4, rating: 8.7, reviewCount: 1200 }],
      {
        data: [
          {
            hotelId: "lp1",
            roomTypes: [
              {
                offerId: "o1",
                rates: [
                  {
                    name: "Double Room",
                    boardType: "BB",
                    retailRate: { total: [{ amount: 400, currency: "EUR" }], taxesAndFees: [{ included: false, description: "City tax", amount: 16, currency: "EUR" }] },
                    cancellationPolicies: { refundableTag: "RFN", cancelPolicyInfos: [{ cancelTime: "2027-04-28 12:00:00" }] },
                  },
                ],
              },
            ],
          },
        ],
      },
      { citySlug: "lisbonne", lat: 38.7223, lon: -9.1393, checkin: "2027-05-01", checkout: "2027-05-05", adults: 2, rooms: 1, currency: "EUR" },
      true,
      "2027-01-01T00:00:00Z",
    );
    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.source.isDemo).toBe(true);
    expect(o.price.totalCents).toBe(40000);
    expect(o.price.perNightCents).toBe(10000);
    expect(o.price.payAtPropertyCents).toBe(1600);
    expect(o.price.estimatedTotalCents).toBe(41600);
    expect(o.board).toBe("breakfast");
    expect(o.cancellation.refundable).toBe(true);
  });
});
