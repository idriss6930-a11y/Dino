import { describe, expect, it } from "vitest";
import { computeUnitEconomics, profitAtCpa, type BusinessParams, type Offer } from "../src/economics/unitEconomics";

// Micro-entrepreneur en franchise de TVA (art. 293 B CGI) : le prix payé = chiffre d'affaires,
// cotisations sociales micro sur le CA encaissé, TVA autoliquidée NON récupérable sur la pub.
const franchise: BusinessParams = {
  vatRegime: "franchise",
  vatRate: 0.2,
  turnoverChargeRate: 0.124,
  paymentFeePct: 0.015,
  paymentFeeFixed: 0.25,
  refundRate: 0,
  refundCostRecoveryRate: 0,
  chargebackRate: 0,
  chargebackFee: 15,
  otherVariableCostPerOrder: 0,
  adVatRecoverable: false,
};

const pillow: Offer = { id: "pillow-1", name: "Oreiller papillon x1", price: 59, landedCost: 18 };

describe("computeUnitEconomics", () => {
  it("computes contribution before ads for a VAT-franchised micro-entrepreneur", () => {
    const ue = computeUnitEconomics(pillow, franchise);
    // 59 - 18 - (59*1.5% + 0.25) - 59*12.4%
    expect(ue.revenueNet).toBeCloseTo(59, 6);
    expect(ue.paymentFees).toBeCloseTo(1.135, 6);
    expect(ue.turnoverCharges).toBeCloseTo(7.316, 6);
    expect(ue.contributionBeforeAds).toBeCloseTo(32.549, 6);
  });

  it("divides max CPA by 1.2 when VAT on ad invoices is not recoverable", () => {
    const ue = computeUnitEconomics(pillow, franchise);
    expect(ue.adCostMultiplier).toBeCloseTo(1.2, 6);
    expect(ue.maxCpa).toBeCloseTo(32.549 / 1.2, 6);
    expect(ue.breakEvenRoas).toBeCloseTo(59 / (32.549 / 1.2), 6);
  });

  it("uses revenue excluding VAT and a 1.0 ad multiplier under the standard VAT regime", () => {
    const ue = computeUnitEconomics(pillow, {
      ...franchise,
      vatRegime: "standard",
      turnoverChargeRate: 0,
      adVatRecoverable: true,
    });
    expect(ue.revenueNet).toBeCloseTo(59 / 1.2, 6);
    expect(ue.adCostMultiplier).toBe(1);
    expect(ue.maxCpa).toBeCloseTo(ue.contributionBeforeAds, 6);
  });

  it("loses kept revenue and unrecovered product cost on refunds but keeps paying payment fees", () => {
    const ue = computeUnitEconomics(pillow, { ...franchise, refundRate: 0.1 });
    // revenue kept 53.1 ; charges 12.4% of 53.1 ; fees on the original charge ; product cost lost
    expect(ue.revenueKept).toBeCloseTo(53.1, 6);
    expect(ue.turnoverCharges).toBeCloseTo(0.124 * 53.1, 6);
    expect(ue.contributionBeforeAds).toBeCloseTo(53.1 - 18 - 1.135 - 0.124 * 53.1, 6);
  });

  it("recovers part of the product cost when refunded items can be resold", () => {
    const ue = computeUnitEconomics(pillow, { ...franchise, refundRate: 0.1, refundCostRecoveryRate: 0.5 });
    expect(ue.landedCostExpected).toBeCloseTo(18 - 0.1 * 0.5 * 18, 6);
  });

  it("charges the chargeback fee on top of the lost order value", () => {
    const ue = computeUnitEconomics(pillow, { ...franchise, chargebackRate: 0.01 });
    expect(ue.revenueKept).toBeCloseTo(59 * 0.99, 6);
    expect(ue.chargebackFees).toBeCloseTo(0.15, 6);
  });

  it("adds customs, packaging and other per-order costs to the cost base", () => {
    const ue = computeUnitEconomics(
      { ...pillow, packagingCost: 0.5, customsPerOrder: 5 },
      { ...franchise, otherVariableCostPerOrder: 1 },
    );
    expect(ue.contributionBeforeAds).toBeCloseTo(32.549 - 0.5 - 5 - 1, 6);
  });

  it("reports a gross margin rate on net revenue", () => {
    const ue = computeUnitEconomics(pillow, franchise);
    expect(ue.grossMarginRate).toBeCloseTo((59 - 18) / 59, 6);
  });

  it("returns a non-positive max CPA and an infinite break-even ROAS when the offer loses money before ads", () => {
    const ue = computeUnitEconomics({ ...pillow, landedCost: 60 }, franchise);
    expect(ue.contributionBeforeAds).toBeLessThan(0);
    expect(ue.maxCpa).toBeLessThan(0);
    expect(ue.breakEvenRoas).toBe(Number.POSITIVE_INFINITY);
  });

  it("rejects impossible inputs", () => {
    expect(() => computeUnitEconomics({ ...pillow, price: 0 }, franchise)).toThrow(/price/);
    expect(() => computeUnitEconomics(pillow, { ...franchise, refundRate: 1.2 })).toThrow(/refundRate/);
    expect(() => computeUnitEconomics(pillow, { ...franchise, refundRate: 0.6, chargebackRate: 0.5 })).toThrow(
      /refundRate \+ chargebackRate/,
    );
  });
});

describe("profitAtCpa", () => {
  it("subtracts the ad cost per order including non-recoverable VAT", () => {
    const ue = computeUnitEconomics(pillow, franchise);
    expect(profitAtCpa(ue, 20)).toBeCloseTo(32.549 - 24, 6);
  });

  it("is zero at the max CPA", () => {
    const ue = computeUnitEconomics(pillow, franchise);
    expect(profitAtCpa(ue, ue.maxCpa)).toBeCloseTo(0, 6);
  });
});
