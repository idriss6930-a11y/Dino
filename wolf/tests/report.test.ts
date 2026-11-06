import { describe, expect, it } from "vitest";
import { buildDailyReport } from "../src/pnl/report";
import { loadBusinessConfig, loadOffersConfig } from "../src/lib/config";
import type { RawOrder } from "../src/pnl/daily";

const order = (id: string, createdAt: string, total: string): RawOrder => ({
  id,
  name: `#${id}`,
  createdAt,
  cancelledAt: null,
  displayFinancialStatus: "PAID",
  displayFulfillmentStatus: "FULFILLED",
  totalPriceSet: { shopMoney: { amount: total } },
  totalRefundedSet: { shopMoney: { amount: "0.0" } },
  lineItems: { edges: [{ node: { quantity: 1, variant: { inventoryItem: { unitCost: { amount: "18.0" } } } } }] },
});

const alertsConfig = {
  heroOfferId: "pillow-1",
  killSpendMultiple: 1.5,
  maxRefundRate: 0.08,
  minOrdersForRefundRate: 10,
  minSessionsForFunnelCheck: 80,
  minCheckoutsForCompletionCheck: 10,
  minCheckoutCompletion: 0.3,
  spendSpikeMultiple: 2,
  consecutiveLossDays: 3,
};

describe("buildDailyReport", () => {
  const base = {
    business: loadBusinessConfig(),
    offers: loadOffersConfig(),
    alertsConfig,
    now: new Date("2026-11-12T08:00:00Z"),
    days: ["2026-11-09", "2026-11-10", "2026-11-11"],
  };

  it("derives alert thresholds from the hero offer and flags a losing test", () => {
    const report = buildDailyReport({
      ...base,
      rawOrders: [],
      funnel: [],
      ads: ["2026-11-09", "2026-11-10", "2026-11-11"].map((day) => ({ day, platform: "meta" as const, spend: 15, impressions: 1500, clicks: 20 })),
    });
    expect(report.thresholds.maxCpa).toBeGreaterThan(20);
    expect(report.alerts.map((a) => a.code)).toContain("KILL_NO_SALES");
    expect(report.markdown).toContain("KILL_NO_SALES");
    expect(report.totals.netProfit).toBeLessThan(0);
  });

  it("summarises orders, revenue and net profit over the period", () => {
    const report = buildDailyReport({
      ...base,
      rawOrders: [order("1", "2026-11-10T10:00:00Z", "59.00"), order("2", "2026-11-11T10:00:00Z", "99.00")],
      funnel: [],
      ads: [],
    });
    expect(report.totals.orders).toBe(2);
    expect(report.totals.revenue).toBeCloseTo(158, 6);
    expect(report.markdown).toMatch(/Bénéfice net/);
  });
});
