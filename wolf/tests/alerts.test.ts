import { describe, expect, it } from "vitest";
import { evaluateAlerts, type DailyMetrics, type Thresholds } from "../src/monitoring/rules";

const thresholds: Thresholds = {
  maxCpa: 25,
  breakEvenRoas: 2.4,
  killSpendMultiple: 1.5,
  maxRefundRate: 0.08,
  minOrdersForRefundRate: 10,
  minSessionsForFunnelCheck: 100,
  minCheckoutsForCompletionCheck: 10,
  minCheckoutCompletion: 0.3,
  spendSpikeMultiple: 2,
  consecutiveLossDays: 3,
};

const day = (date: string, m: Partial<DailyMetrics> = {}): DailyMetrics => ({
  date,
  adSpend: 0,
  orders: 0,
  revenue: 0,
  refundedOrders: 0,
  sessions: 0,
  addToCarts: 0,
  checkoutsReached: 0,
  checkoutsCompleted: 0,
  ...m,
});

const codes = (history: DailyMetrics[]) => evaluateAlerts(history, thresholds).map((a) => a.code);

describe("evaluateAlerts", () => {
  it("raises no alert on a healthy profitable day", () => {
    const history = [day("2026-11-10", { adSpend: 50, orders: 4, revenue: 236, sessions: 300, addToCarts: 20, checkoutsReached: 10, checkoutsCompleted: 5, netProfit: 30 })];
    expect(codes(history)).toEqual([]);
  });

  it("orders a cut when 3-day spend reaches 1.5 x max CPA without a sale", () => {
    const history = [day("2026-11-08", { adSpend: 13 }), day("2026-11-09", { adSpend: 13 }), day("2026-11-10", { adSpend: 13 })];
    const alerts = evaluateAlerts(history, thresholds);
    expect(alerts.find((a) => a.code === "KILL_NO_SALES")?.severity).toBe("critique");
  });

  it("counts the spend since the last sale, beyond a 3-day window", () => {
    const history = [
      day("2026-11-05", { adSpend: 20, orders: 1, revenue: 99 }),
      ...["06", "07", "08", "09"].map((d) => day(`2026-11-${d}`, { adSpend: 20 })),
    ];
    const strict = { ...thresholds, killSpendMultiple: 3 };
    const alert = evaluateAlerts(history, strict).find((a) => a.code === "KILL_NO_SALES");
    expect(alert?.value).toBe(80);
    expect(evaluateAlerts(history.slice(0, 4), strict).map((a) => a.code)).not.toContain("KILL_NO_SALES");
  });

  it("flags a 3-day CPA above the max CPA", () => {
    const history = [day("2026-11-10", { adSpend: 90, orders: 3, revenue: 270 })];
    expect(codes(history)).toContain("CPA_ABOVE_MAX");
  });

  it("flags a 3-day ROAS below break-even", () => {
    const history = [day("2026-11-10", { adSpend: 100, orders: 5, revenue: 200 })];
    expect(codes(history)).toContain("ROAS_BELOW_BREAKEVEN");
  });

  it("flags a 14-day refund rate above the limit once enough orders exist", () => {
    const history = [day("2026-11-09", { orders: 10, refundedOrders: 1 }), day("2026-11-10", { orders: 2, refundedOrders: 1 })];
    expect(codes(history)).toContain("REFUND_RATE_HIGH");
    expect(codes([day("2026-11-10", { orders: 2, refundedOrders: 1 })])).not.toContain("REFUND_RATE_HIGH");
  });

  it("flags traffic with zero add-to-cart as a blocking product page", () => {
    expect(codes([day("2026-11-10", { sessions: 120 })])).toContain("NO_ADD_TO_CART");
    expect(codes([day("2026-11-10", { sessions: 40 })])).not.toContain("NO_ADD_TO_CART");
  });

  it("flags a checkout completion rate under the minimum", () => {
    expect(codes([day("2026-11-10", { sessions: 200, addToCarts: 30, checkoutsReached: 20, checkoutsCompleted: 2 })])).toContain("CHECKOUT_DROP");
  });

  it("flags a spend spike against the previous 7-day average", () => {
    const history = [
      day("2026-11-07", { adSpend: 20, orders: 1, revenue: 59 }),
      day("2026-11-08", { adSpend: 20, orders: 1, revenue: 59 }),
      day("2026-11-09", { adSpend: 20, orders: 1, revenue: 59 }),
      day("2026-11-10", { adSpend: 60, orders: 3, revenue: 177 }),
    ];
    expect(codes(history)).toContain("SPEND_SPIKE");
  });

  it("flags consecutive losing days", () => {
    const history = ["08", "09", "10"].map((d) => day(`2026-11-${d}`, { netProfit: -5 }));
    expect(codes(history)).toContain("CONSECUTIVE_LOSSES");
    expect(codes(history.slice(1))).not.toContain("CONSECUTIVE_LOSSES");
  });

  it("flags orders left unfulfilled for more than 48 hours", () => {
    const alerts = evaluateAlerts([day("2026-11-10", { unfulfilledOver48h: 2 })], thresholds);
    expect(alerts.find((a) => a.code === "FULFILLMENT_DELAY")?.severity).toBe("critique");
  });

  it("returns nothing for an empty history", () => {
    expect(evaluateAlerts([], thresholds)).toEqual([]);
  });
});
