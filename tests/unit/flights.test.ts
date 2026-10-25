import { describe, expect, it } from "vitest";
import { applyNeeds, dedupeOffers, filterOffers, flightQuerySchema, sortOffers } from "@/lib/services/flight-search";
import type { FlightOffer } from "@/lib/providers/types";
import { mapDuffelOffer } from "@/lib/providers/flights/duffel";
import { mapTravelpayoutsRow } from "@/lib/providers/flights/travelpayouts";
import { DemoFlightProvider, demoFareCents } from "@/lib/providers/flights/demo";

function offer(id: string, p: Partial<{ total: number; minutes: number; stops: number; depart: string; arrive: string; source: string; flight: string; bagFee: number; refundable: boolean }> = {}): FlightOffer {
  const depart = p.depart ?? "2027-03-10T08:00";
  const arrive = p.arrive ?? "2027-03-10T10:00";
  const minutes = p.minutes ?? 120;
  return {
    id,
    source: { id: p.source ?? "demo", name: p.source ?? "demo", isDemo: true, freshness: "synthetic" },
    slices: [
      {
        origin: "CDG",
        destination: "LIS",
        segments: [{ carrierCode: "XX", carrierName: "X", flightNumber: p.flight ?? `XX${id}`, origin: "CDG", destination: "LIS", departLocal: depart, arriveLocal: arrive, originTz: "Europe/Paris", destinationTz: "Europe/Lisbon", durationMinutes: minutes }],
        durationMinutes: minutes,
        stops: p.stops ?? 0,
        layovers: [],
        departLocal: depart,
        arriveLocal: arrive,
        dayShift: 0,
      },
    ],
    validatingCarrier: "XX",
    price: {
      currency: "EUR",
      ticketTotalCents: p.total ?? 10000,
      perPassengerCents: p.total ?? 10000,
      lines: p.bagFee ? [{ label: "Bagage en soute", cents: p.bagFee, kind: "fee", included: false }] : [],
      estimatedTotalCents: p.total ?? 10000,
      original: { cents: p.total ?? 10000, currency: "EUR" },
    },
    baggage: { cabinBags: 1, checkedBags: 0, checkedBagFeeCents: p.bagFee ?? null },
    conditions: { refundable: p.refundable ?? false, changeable: null },
    booking: { type: "unavailable", label: "Démo" },
    fetchedAt: "2027-01-01T00:00:00Z",
    comparableKey: "k",
  };
}

const q = (extra: Record<string, unknown> = {}) => flightQuerySchema.parse({ trip: "oneway", origin: "CDG", destination: "LIS", departDate: "2027-03-10", ...extra });

describe("comparaison de vols", () => {
  it("fusionne un même vol vu chez deux sources et garde le moins cher", () => {
    const a = offer("1", { total: 12000, source: "a", flight: "TP440" });
    const b = offer("2", { total: 11000, source: "b", flight: "TP440" });
    const out = dedupeOffers([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].price.ticketTotalCents).toBe(11000);
    expect(out[0].alsoFrom?.[0].totalCents).toBe(12000);
  });

  it("ajoute le bagage soute au coût total seulement si le voyageur en a besoin", () => {
    const o = offer("1", { total: 10000, bagFee: 3500 });
    expect(applyNeeds([o], { checkedBag: false })[0].price.estimatedTotalCents).toBe(10000);
    expect(applyNeeds([o], { checkedBag: true })[0].price.estimatedTotalCents).toBe(13500);
  });

  it("filtre escales, horaires, durée, prix et remboursement", () => {
    const offers = [
      offer("direct", { stops: 0 }),
      offer("escale", { stops: 1, minutes: 300 }),
      offer("tot", { depart: "2027-03-10T05:00" }),
      offer("cher", { total: 90000 }),
      offer("remb", { refundable: true }),
    ];
    expect(filterOffers(offers, q({ maxStops: 0 })).map((o) => o.id)).not.toContain("escale");
    expect(filterOffers(offers, q({ departAfter: 7 })).map((o) => o.id)).not.toContain("tot");
    expect(filterOffers(offers, q({ maxDurationHours: 4 })).map((o) => o.id)).not.toContain("escale");
    expect(filterOffers(offers, q({ maxPrice: 500 })).map((o) => o.id)).not.toContain("cher");
    expect(filterOffers(offers, q({ refundableOnly: "true" })).map((o) => o.id)).toEqual(["remb"]);
  });

  it("interprète « false » comme faux dans les paramètres d'URL", () => {
    expect(q({ checkedBag: "false" }).checkedBag).toBe(false);
    expect(q({ checkedBag: "true" }).checkedBag).toBe(true);
  });

  it("trie par prix et par meilleur choix (prix, durée, escales)", () => {
    const cheapSlow = offer("cs", { total: 9000, minutes: 600, stops: 2 });
    const fair = offer("f", { total: 10000, minutes: 120, stops: 0 });
    expect(sortOffers([fair, cheapSlow], "price")[0].id).toBe("cs");
    expect(sortOffers([cheapSlow, fair], "best")[0].id).toBe("f");
  });

  it("refuse un retour avant l'aller et exige les champs", () => {
    expect(() => flightQuerySchema.parse({ trip: "roundtrip", origin: "CDG", destination: "LIS", departDate: "2027-03-10", returnDate: "2027-03-01" })).toThrow();
    expect(() => flightQuerySchema.parse({ trip: "oneway", origin: "CDG" })).toThrow();
  });
});

describe("fournisseur de démonstration", () => {
  it("est déterministe et toujours marqué démo, sans lien de réservation", async () => {
    const p = new DemoFlightProvider();
    const params = { slices: [{ origin: "CDG", destination: "LIS", date: "2027-03-10" }], adults: 1, children: 0, cabin: "economy" as const, currency: "EUR" };
    const a = await p.search(params, new AbortController().signal);
    const b = await p.search(params, new AbortController().signal);
    expect(a.length).toBeGreaterThan(0);
    expect(a.map((o) => o.price.ticketTotalCents)).toEqual(b.map((o) => o.price.ticketTotalCents));
    expect(a.every((o) => o.source.isDemo && o.booking.type === "unavailable")).toBe(true);
    expect(a.every((o) => o.slices[0].segments.every((s) => /fictive|Démo/i.test(s.carrierName) || s.carrierName.includes("(fictive)")))).toBe(true);
  });
  it("donne des prix plus élevés en classe affaires", () => {
    const o = { origin: "CDG", destination: "JFK", travelDate: "2027-03-10", observedDate: "2027-01-10", stops: 0 };
    const eco = demoFareCents({ ...o, cabin: "economy" });
    const biz = demoFareCents({ ...o, cabin: "business" });
    expect(biz).toBeGreaterThan(eco * 2);
  });
});

describe("adaptateurs de fournisseurs réels (réponses d'exemple)", () => {
  const params = { slices: [{ origin: "CDG", destination: "JFK", date: "2027-05-01" }], adults: 2, children: 0, cabin: "economy" as const, currency: "EUR" };

  it("Duffel : horaires locaux, +1 jour, taxes séparées, mode test marqué", () => {
    const o = mapDuffelOffer(
      {
        id: "off_1",
        total_amount: "820.40",
        total_currency: "EUR",
        base_amount: "600.00",
        tax_amount: "220.40",
        live_mode: false,
        owner: { iata_code: "ZZ", name: "Duffel Airways" },
        slices: [
          {
            duration: "PT8H30M",
            segments: [
              {
                origin: { iata_code: "CDG", time_zone: "Europe/Paris" },
                destination: { iata_code: "JFK", time_zone: "America/New_York" },
                departing_at: "2027-05-01T22:00:00",
                arriving_at: "2027-05-02T00:30:00",
                marketing_carrier: { iata_code: "ZZ", name: "Duffel Airways" },
                marketing_carrier_flight_number: "100",
                passengers: [{ baggages: [{ type: "checked", quantity: 1 }] }],
              },
            ],
          },
        ],
        conditions: { refund_before_departure: { allowed: false }, change_before_departure: { allowed: true } },
      },
      params,
      "2027-01-01T00:00:00Z",
    );
    expect(o.source.isDemo).toBe(true);
    expect(o.price.ticketTotalCents).toBe(82040);
    expect(o.price.perPassengerCents).toBe(41020);
    expect(o.price.lines.find((l) => l.kind === "taxes")?.cents).toBe(22040);
    expect(o.slices[0].departLocal).toBe("2027-05-01T22:00");
    expect(o.slices[0].dayShift).toBe(1);
    expect(o.slices[0].durationMinutes).toBe(510);
    expect(o.baggage.checkedBags).toBe(1);
    expect(o.conditions.refundable).toBe(false);
    expect(o.booking.type).toBe("unavailable");
  });

  it("Travelpayouts : prix par adulte multiplié, lien affilié, prix en cache", () => {
    process.env.TRAVELPAYOUTS_MARKER = "12345";
    const o = mapTravelpayoutsRow(
      { origin: "PAR", destination: "NYC", origin_airport: "CDG", destination_airport: "JFK", price: 310, airline: "AF", flight_number: 6, departure_at: "2027-05-01T10:30:00+02:00", transfers: 0, duration_to: 505, link: "/search/PAR0105NYC1" },
      params,
      "EUR",
      "2027-01-01T00:00:00Z",
    );
    expect(o).not.toBeNull();
    expect(o!.price.ticketTotalCents).toBe(62000);
    expect(o!.source.freshness).toBe("cached");
    expect(o!.slices[0].departLocal).toBe("2027-05-01T10:30");
    expect(o!.booking.type).toBe("affiliate_redirect");
    if (o!.booking.type === "affiliate_redirect") expect(o!.booking.url).toContain("marker=12345");
  });
});
