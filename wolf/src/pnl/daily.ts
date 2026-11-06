import type { BusinessParams } from "../economics/unitEconomics";
import type { DailyMetrics } from "../monitoring/rules";

/**
 * P&L quotidien : commandes Shopify + dépenses publicitaires + paramètres fiscaux → bénéfice net par jour.
 * Conventions (documentées dans docs/07-automatisation.md) :
 *  - un remboursement est rattaché au jour de la commande d'origine ;
 *  - les frais de paiement sont estimés avec les taux de config/business.fr.json ;
 *  - le coût produit d'une commande remboursée reste dû (le fournisseur a été payé).
 */

/** Requête validée sur le schéma Admin 2026-10 le 06/11/2026. */
export const ORDERS_QUERY = `query Orders($q: String!, $after: String) {
  orders(first: 100, query: $q, after: $after, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      lineItems(first: 50) { edges { node { quantity variant { inventoryItem { unitCost { amount } } } } } }
    } }
  }
}`;

/** Entonnoir du jour (ShopifyQL via `shopifyqlQuery`, validé le 06/11/2026). */
export const FUNNEL_SHOPIFYQL = (since: string, until: string) =>
  `FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout TIMESERIES day SINCE ${since} UNTIL ${until}`;

export interface RawOrder {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string } };
  totalRefundedSet: { shopMoney: { amount: string } };
  lineItems: { edges: { node: { quantity: number; variant: { inventoryItem: { unitCost: { amount: string } | null } } | null } }[] };
}

export interface OrderFact {
  id: string;
  day: string;
  total: number;
  refunded: number;
  landedCost: number;
  missingCost: boolean;
  unfulfilledOver48h: boolean;
}

export interface AdSpendRow {
  day: string;
  platform: "meta" | "tiktok" | "google";
  spend: number;
  impressions: number;
  clicks: number;
  purchases?: number;
  purchaseValue?: number;
}

export interface FunnelRow {
  day: string;
  sessions: number;
  addToCarts: number;
  checkoutsReached: number;
  checkoutsCompleted: number;
}

export interface DailyPnl {
  day: string;
  orders: number;
  refundedOrders: number;
  revenue: number;
  refunds: number;
  revenueKept: number;
  landedCost: number;
  paymentFees: number;
  turnoverCharges: number;
  adSpendInvoiced: number;
  adCost: number;
  fixedCosts: number;
  netProfit: number;
  missingCostOrders: number;
}

const UNFULFILLED = new Set(["UNFULFILLED", "PARTIALLY_FULFILLED", "ON_HOLD"]);
const HOURS_48 = 48 * 3_600_000;

export function dayInZone(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function toOrderFacts(raw: RawOrder[], timeZone: string, now: Date): OrderFact[] {
  return raw
    .filter((order) => order.cancelledAt == null)
    .map((order) => {
      let landedCost = 0;
      let missingCost = false;
      for (const { node } of order.lineItems.edges) {
        const cost = node.variant?.inventoryItem.unitCost;
        if (cost == null) missingCost = true;
        else landedCost += node.quantity * Number(cost.amount);
      }
      return {
        id: order.id,
        day: dayInZone(order.createdAt, timeZone),
        total: Number(order.totalPriceSet.shopMoney.amount),
        refunded: Number(order.totalRefundedSet.shopMoney.amount),
        landedCost,
        missingCost,
        unfulfilledOver48h:
          UNFULFILLED.has(order.displayFulfillmentStatus) && now.getTime() - Date.parse(order.createdAt) > HOURS_48,
      };
    });
}

export function toFunnelRows(rows: Record<string, string>[]): FunnelRow[] {
  return rows.map((row) => ({
    day: String(row.day),
    sessions: Number(row.sessions ?? 0),
    addToCarts: Number(row.sessions_with_cart_additions ?? 0),
    checkoutsReached: Number(row.sessions_that_reached_checkout ?? 0),
    checkoutsCompleted: Number(row.sessions_that_completed_checkout ?? 0),
  }));
}

export interface PnlInput {
  orders: OrderFact[];
  ads: AdSpendRow[];
  params: BusinessParams;
  fixedCostsMonthly: number;
  /** Jours à inclure même sans activité (AAAA-MM-JJ). */
  days: string[];
}

export function buildDailyPnl({ orders, ads, params, fixedCostsMonthly, days }: PnlInput): DailyPnl[] {
  const allDays = [...new Set([...days, ...orders.map((o) => o.day), ...ads.map((a) => a.day)])].sort();
  const vatDivisor = params.vatRegime === "standard" ? 1 + params.vatRate : 1;
  const adMultiplier = params.adVatRecoverable ? 1 : 1 + params.vatRate;
  const fixedCosts = fixedCostsMonthly / 30;

  return allDays.map((day) => {
    const dayOrders = orders.filter((o) => o.day === day);
    const revenue = dayOrders.reduce((s, o) => s + o.total, 0);
    const refunds = dayOrders.reduce((s, o) => s + o.refunded, 0);
    const revenueKept = (revenue - refunds) / vatDivisor;
    const landedCost = dayOrders.reduce((s, o) => s + o.landedCost, 0);
    const paymentFees = dayOrders.reduce((s, o) => s + o.total * params.paymentFeePct + params.paymentFeeFixed, 0);
    const turnoverCharges = revenueKept * params.turnoverChargeRate;
    const adSpendInvoiced = ads.filter((a) => a.day === day).reduce((s, a) => s + a.spend, 0);
    const adCost = adSpendInvoiced * adMultiplier;
    const otherVariable = dayOrders.length * params.otherVariableCostPerOrder;
    return {
      day,
      orders: dayOrders.length,
      refundedOrders: dayOrders.filter((o) => o.refunded > 0).length,
      revenue,
      refunds,
      revenueKept,
      landedCost,
      paymentFees,
      turnoverCharges,
      adSpendInvoiced,
      adCost,
      fixedCosts,
      netProfit: revenueKept - landedCost - paymentFees - turnoverCharges - adCost - fixedCosts - otherVariable,
      missingCostOrders: dayOrders.filter((o) => o.missingCost).length,
    };
  });
}

export function toDailyMetrics(pnl: DailyPnl[], funnel: FunnelRow[], orders: OrderFact[]): DailyMetrics[] {
  const lateOrders = orders.filter((o) => o.unfulfilledOver48h).length;
  return pnl.map((day, index) => {
    const f = funnel.find((row) => row.day === day.day);
    return {
      date: day.day,
      adSpend: day.adSpendInvoiced,
      orders: day.orders,
      revenue: day.revenue,
      refundedOrders: day.refundedOrders,
      sessions: f?.sessions ?? 0,
      addToCarts: f?.addToCarts ?? 0,
      checkoutsReached: f?.checkoutsReached ?? 0,
      checkoutsCompleted: f?.checkoutsCompleted ?? 0,
      netProfit: day.netProfit,
      unfulfilledOver48h: index === pnl.length - 1 ? lateOrders : 0,
    };
  });
}
