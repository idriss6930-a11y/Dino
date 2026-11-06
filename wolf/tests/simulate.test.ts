import { describe, expect, it } from "vitest";
import { computeUnitEconomics, type BusinessParams } from "../src/economics/unitEconomics";
import { simulateCampaign } from "../src/economics/simulate";

const params: BusinessParams = {
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
const offer = { id: "kit", name: "Kit", price: 59, landedCost: 18 };
const ue = computeUnitEconomics(offer, params);

const base = {
  offer,
  unitEconomics: ue,
  days: 10,
  dailyAdSpend: 50,
  cpa: 25,
  fixedCostsMonthly: 0,
  oneOffCosts: 0,
  payoutDelayDays: 0,
};

describe("simulateCampaign", () => {
  it("expects orders equal to ad spend divided by CPA", () => {
    const result = simulateCampaign(base);
    expect(result.orders).toBeCloseTo(20, 6);
    expect(result.adSpendInvoiced).toBeCloseTo(500, 6);
    expect(result.adSpendCost).toBeCloseTo(600, 6);
  });

  it("nets contribution against ad cost, fixed costs and one-off costs", () => {
    const result = simulateCampaign({ ...base, fixedCostsMonthly: 30, oneOffCosts: 100 });
    const expected = 20 * ue.contributionBeforeAds - 600 - 30 * (10 / 30) - 100;
    expect(result.netProfit).toBeCloseTo(expected, 6);
  });

  it("needs only the one-off costs in cash when payouts are instant and orders are profitable", () => {
    const result = simulateCampaign({ ...base, oneOffCosts: 100 });
    expect(result.peakCashNeed).toBeCloseTo(100, 6);
  });

  it("needs more cash when Shopify pays out later than the supplier and ad platform are paid", () => {
    const instant = simulateCampaign(base);
    const delayed = simulateCampaign({ ...base, payoutDelayDays: 3 });
    const dailyOutflow = 50 * ue.adCostMultiplier + 2 * offer.landedCost;
    expect(delayed.peakCashNeed).toBeGreaterThanOrEqual(3 * dailyOutflow - 1e-9);
    expect(delayed.peakCashNeed).toBeGreaterThan(instant.peakCashNeed);
  });

  it("reports a loss and a growing cash need when CPA is above the break-even CPA", () => {
    const result = simulateCampaign({ ...base, cpa: ue.maxCpa * 2 });
    expect(result.netProfit).toBeLessThan(0);
    expect(result.peakCashNeed).toBeGreaterThan(0);
  });

  it("ends with cash equal to net profit once every payout is received", () => {
    const result = simulateCampaign({ ...base, payoutDelayDays: 4, fixedCostsMonthly: 45, oneOffCosts: 80 });
    expect(result.cashByDay.at(-1)).toBeCloseTo(result.netProfit, 6);
  });

  it("rejects a non-positive CPA", () => {
    expect(() => simulateCampaign({ ...base, cpa: 0 })).toThrow(/cpa/);
  });
});
