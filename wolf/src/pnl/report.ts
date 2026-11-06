import { computeUnitEconomics } from "../economics/unitEconomics";
import type { BusinessConfig, OffersConfig } from "../lib/config";
import { eur, table } from "../lib/format";
import { evaluateAlerts, type Alert, type Thresholds } from "../monitoring/rules";
import { buildDailyPnl, toDailyMetrics, toOrderFacts, type AdSpendRow, type DailyPnl, type FunnelRow, type RawOrder } from "./daily";

export interface AlertsConfig extends Omit<Thresholds, "maxCpa" | "breakEvenRoas"> {
  heroOfferId: string;
}

export interface ReportInput {
  business: BusinessConfig;
  offers: OffersConfig;
  alertsConfig: AlertsConfig;
  rawOrders: RawOrder[];
  funnel: FunnelRow[];
  ads: AdSpendRow[];
  days: string[];
  now: Date;
}

export interface DailyReport {
  pnl: DailyPnl[];
  alerts: Alert[];
  thresholds: Thresholds;
  totals: { orders: number; revenue: number; adCost: number; netProfit: number; missingCostOrders: number };
  markdown: string;
}

export function buildDailyReport(input: ReportInput): DailyReport {
  const hero = input.offers.offers.find((o) => o.id === input.alertsConfig.heroOfferId);
  if (!hero) throw new Error(`Offre principale introuvable : ${input.alertsConfig.heroOfferId}`);
  const ue = computeUnitEconomics(hero, input.business.params);
  const { heroOfferId: _hero, ...rest } = input.alertsConfig;
  const thresholds: Thresholds = { ...rest, maxCpa: ue.maxCpa, breakEvenRoas: ue.breakEvenRoas };

  const orders = toOrderFacts(input.rawOrders, input.business.timeZone, input.now);
  const pnl = buildDailyPnl({ orders, ads: input.ads, params: input.business.params, fixedCostsMonthly: input.business.fixedCostsMonthlyTotal, days: input.days });
  const alerts = evaluateAlerts(toDailyMetrics(pnl, input.funnel, orders), thresholds);

  const totals = {
    orders: pnl.reduce((s, d) => s + d.orders, 0),
    revenue: pnl.reduce((s, d) => s + d.revenue, 0),
    adCost: pnl.reduce((s, d) => s + d.adCost, 0),
    netProfit: pnl.reduce((s, d) => s + d.netProfit, 0),
    missingCostOrders: pnl.reduce((s, d) => s + d.missingCostOrders, 0),
  };

  const icon = { critique: "🔴", alerte: "🟠", info: "🔵" } as const;
  const markdown = [
    `# Rapport THE WOLF — ${input.now.toISOString().slice(0, 10)}`,
    "",
    `Seuils (offre ${hero.name}) : CPA max ${eur(ue.maxCpa)} HT régie · ROAS de rentabilité ${ue.breakEvenRoas.toFixed(2)}.`,
    "",
    table(
      ["Jour", "Cmd", "CA TTC", "Remb.", "Coût produit", "Frais paiement", "Charges CA", "Pub (TVA incl.)", "Fixes", "Bénéfice net"],
      pnl.map((d) => [d.day, d.orders, eur(d.revenue), eur(d.refunds), eur(d.landedCost), eur(d.paymentFees), eur(d.turnoverCharges), eur(d.adCost), eur(d.fixedCosts), eur(d.netProfit)]),
    ),
    "",
    `**Période : ${totals.orders} commande(s), CA ${eur(totals.revenue)}, pub ${eur(totals.adCost)}, Bénéfice net ${eur(totals.netProfit)}.**`,
    totals.missingCostOrders > 0 ? `\n⚠️ ${totals.missingCostOrders} commande(s) sans coût unitaire : bénéfice surestimé tant que les coûts ne sont pas saisis.` : "",
    "",
    "## Alertes",
    alerts.length === 0 ? "Aucune alerte." : alerts.map((a) => `- ${icon[a.severity]} **${a.code}** — ${a.message}`).join("\n"),
  ].join("\n");

  return { pnl, alerts, thresholds, totals, markdown };
}
