import { describe, expect, it } from "vitest";
import type { FlightOffer } from "@/lib/providers/types";
import { googleFlightsUrl } from "@/lib/utils/googleFlights";

const slice = (origin: string, destination: string, departLocal: string) => ({ origin, destination, departLocal });

describe("lien Google Flights", () => {
  it("reprend l'aller-retour, les dates et la devise", () => {
    const offer = { slices: [slice("CDG", "LIS", "2026-11-10T08:00"), slice("LIS", "CDG", "2026-11-17T18:00")], price: { currency: "EUR" } } as unknown as FlightOffer;
    const url = new URL(googleFlightsUrl(offer)!);
    expect(url.origin + url.pathname).toBe("https://www.google.com/travel/flights");
    expect(url.searchParams.get("q")).toBe("Flights to LIS from CDG on 2026-11-10 through 2026-11-17");
    expect(url.searchParams.get("curr")).toBe("EUR");
  });
  it("gère l'aller simple", () => {
    const offer = { slices: [slice("ORY", "BCN", "2026-12-01T10:00")], price: { currency: "EUR" } } as unknown as FlightOffer;
    expect(new URL(googleFlightsUrl(offer)!).searchParams.get("q")).toBe("Flights to BCN from ORY on 2026-12-01");
  });
});
