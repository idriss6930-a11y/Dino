import { describe, expect, it } from "vitest";
import { renderDashboard } from "../src/dashboard/render";
import type { DailyReport } from "../src/pnl/report";

const report: DailyReport = {
  pnl: [
    { day: "2026-11-10", orders: 2, refundedOrders: 0, revenue: 158, refunds: 0, revenueKept: 158, landedCost: 54, paymentFees: 3.7, turnoverCharges: 19.6, adSpendInvoiced: 40, adCost: 48, fixedCosts: 2.3, netProfit: 30.4, missingCostOrders: 0 },
    { day: "2026-11-11", orders: 0, refundedOrders: 0, revenue: 0, refunds: 0, revenueKept: 0, landedCost: 0, paymentFees: 0, turnoverCharges: 0, adSpendInvoiced: 25, adCost: 30, fixedCosts: 2.3, netProfit: -32.3, missingCostOrders: 0 },
  ],
  alerts: [{ code: "KILL_NO_SALES", severity: "critique", date: "2026-11-11", message: "Couper <script>alert(1)</script> la pub" }],
  thresholds: { maxCpa: 35.57, breakEvenRoas: 2.78, killSpendMultiple: 1.5, maxRefundRate: 0.08, minOrdersForRefundRate: 10, minSessionsForFunnelCheck: 80, minCheckoutsForCompletionCheck: 10, minCheckoutCompletion: 0.3, spendSpikeMultiple: 2, consecutiveLossDays: 3 },
  totals: { orders: 2, revenue: 158, adCost: 78, netProfit: -1.9, missingCostOrders: 0 },
  markdown: "",
};

describe("renderDashboard", () => {
  const html = renderDashboard(report, { shopName: "Nuitalys", generatedAt: new Date("2026-11-12T07:13:00Z") });

  it("shows the period's net profit and compares real CPA with the max CPA", () => {
    expect(html).toContain("Bénéfice net");
    expect(html).toContain("-1,90 €");
    expect(html).toContain("CPA réel");
    expect(html).toContain("32,50 €");
    expect(html).toContain("35,57 €");
  });

  it("lists alerts with their severity and escapes their text", () => {
    expect(html).toContain("KILL_NO_SALES");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("is a standalone page with one bar per day", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.match(/<rect /g)?.length).toBe(2);
  });
});
