import { describe, expect, it } from "vitest";
import { loadBusinessConfig, loadOffersConfig, parseBusinessConfig } from "../src/lib/config";
import { computeUnitEconomics } from "../src/economics/unitEconomics";

describe("business configuration", () => {
  it("loads the shipped French micro-entrepreneur config and feeds the economics engine", () => {
    const config = loadBusinessConfig();
    expect(config.params.vatRegime).toBe("franchise");
    expect(config.fixedCostsMonthlyTotal).toBeGreaterThan(0);
    const offers = loadOffersConfig();
    expect(() => offers.offers.map((offer) => computeUnitEconomics(offer, config.params))).not.toThrow();
  });

  it("rejects a rate outside 0..1", () => {
    const raw = { timeZone: "Europe/Paris", params: { ...loadBusinessConfig().params, turnoverChargeRate: 2 }, fixedCostsMonthly: { shopify: 36 } };
    expect(() => parseBusinessConfig(raw)).toThrow(/turnoverChargeRate/);
  });
});
