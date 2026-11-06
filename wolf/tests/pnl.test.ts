import { describe, expect, it } from "vitest";
import { buildDailyPnl, toDailyMetrics, toFunnelRows, toOrderFacts, type RawOrder } from "../src/pnl/daily";
import type { BusinessParams } from "../src/economics/unitEconomics";

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

const rawOrder = (id: string, createdAt: string, total: string, refunded: string, costs: Array<string | null>, fulfillment = "FULFILLED"): RawOrder => ({
  id,
  name: `#${id}`,
  createdAt,
  cancelledAt: null,
  displayFinancialStatus: refunded === "0.0" ? "PAID" : "REFUNDED",
  displayFulfillmentStatus: fulfillment,
  totalPriceSet: { shopMoney: { amount: total } },
  totalRefundedSet: { shopMoney: { amount: refunded } },
  lineItems: { edges: costs.map((c) => ({ node: { quantity: 1, variant: { inventoryItem: { unitCost: c == null ? null : { amount: c } } } } })) },
});

describe("toOrderFacts", () => {
  it("buckets orders into Paris calendar days and sums unit costs", () => {
    const [fact] = toOrderFacts([rawOrder("1001", "2026-11-05T23:30:00Z", "99.00", "0.0", ["18.0", "18.0"])], "Europe/Paris", new Date("2026-11-06T12:00:00Z"));
    expect(fact).toMatchObject({ day: "2026-11-06", total: 99, refunded: 0, landedCost: 36, missingCost: false });
  });

  it("marks orders whose cost is unknown and unfulfilled orders older than 48 hours", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const [fact] = toOrderFacts([rawOrder("1002", "2026-11-07T10:00:00Z", "59.00", "0.0", [null], "UNFULFILLED")], "Europe/Paris", now);
    expect(fact?.missingCost).toBe(true);
    expect(fact?.unfulfilledOver48h).toBe(true);
  });

  it("ignores cancelled orders", () => {
    const cancelled = { ...rawOrder("1003", "2026-11-07T10:00:00Z", "59.00", "0.0", ["18.0"]), cancelledAt: "2026-11-07T11:00:00Z" };
    expect(toOrderFacts([cancelled], "Europe/Paris", new Date("2026-11-08T00:00:00Z"))).toEqual([]);
  });
});

describe("toFunnelRows", () => {
  it("converts ShopifyQL string cells to numbers", () => {
    const rows = toFunnelRows([{ day: "2026-11-05", sessions: "94", sessions_with_cart_additions: "0", sessions_that_reached_checkout: "0", sessions_that_completed_checkout: "0" }]);
    expect(rows).toEqual([{ day: "2026-11-05", sessions: 94, addToCarts: 0, checkoutsReached: 0, checkoutsCompleted: 0 }]);
  });
});

describe("buildDailyPnl", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const orders = toOrderFacts(
    [rawOrder("1", "2026-11-07T09:00:00Z", "59.00", "0.0", ["18.0"]), rawOrder("2", "2026-11-07T15:00:00Z", "99.00", "99.00", ["18.0", "18.0"])],
    "Europe/Paris",
    now,
  );
  const ads = [
    { day: "2026-11-07", platform: "meta" as const, spend: 40, impressions: 4000, clicks: 60 },
    { day: "2026-11-06", platform: "meta" as const, spend: 10, impressions: 900, clicks: 9 },
  ];
  const pnl = buildDailyPnl({ orders, ads, params, fixedCostsMonthly: 60, days: ["2026-11-06", "2026-11-07"] });

  it("computes the net profit of a day with sales, a refund and ad spend", () => {
    const day = pnl.find((d) => d.day === "2026-11-07")!;
    const revenue = 158;
    const kept = revenue - 99;
    const fees = revenue * 0.015 + 2 * 0.25;
    const expected = kept - 54 - fees - kept * 0.124 - 40 * 1.2 - 2;
    expect(day.orders).toBe(2);
    expect(day.refundedOrders).toBe(1);
    expect(day.revenueKept).toBeCloseTo(kept, 6);
    expect(day.netProfit).toBeCloseTo(expected, 6);
  });

  it("keeps spend-only days so a losing test is visible", () => {
    const day = pnl.find((d) => d.day === "2026-11-06")!;
    expect(day.orders).toBe(0);
    expect(day.netProfit).toBeCloseTo(-(10 * 1.2) - 2, 6);
  });

  it("feeds the alert engine with funnel and fulfillment data", () => {
    const metrics = toDailyMetrics(pnl, toFunnelRows([{ day: "2026-11-07", sessions: "120", sessions_with_cart_additions: "6", sessions_that_reached_checkout: "3", sessions_that_completed_checkout: "2" }]), orders);
    const day = metrics.find((d) => d.date === "2026-11-07")!;
    expect(day).toMatchObject({ adSpend: 40, orders: 2, revenue: 158, refundedOrders: 1, sessions: 120, addToCarts: 6 });
    expect(day.netProfit).toBeCloseTo(pnl.find((d) => d.day === "2026-11-07")!.netProfit, 6);
  });
});
