/**
 * Règles d'alerte de rentabilité et de détection d'anomalies.
 * Évalue le dernier jour de l'historique avec des fenêtres glissantes (en jours calendaires).
 */

export interface DailyMetrics {
  /** Jour au format AAAA-MM-JJ (fuseau de la boutique). */
  date: string;
  /** Dépense facturée par les régies (HT), toutes plateformes. */
  adSpend: number;
  orders: number;
  /** Ventes TTC encaissées. */
  revenue: number;
  refundedOrders: number;
  sessions: number;
  addToCarts: number;
  checkoutsReached: number;
  checkoutsCompleted: number;
  /** Bénéfice net du jour calculé par le P&L, si disponible. */
  netProfit?: number;
  /** Commandes payées non expédiées depuis plus de 48 h. */
  unfulfilledOver48h?: number;
}

export interface Thresholds {
  maxCpa: number;
  breakEvenRoas: number;
  killSpendMultiple: number;
  maxRefundRate: number;
  minOrdersForRefundRate: number;
  minSessionsForFunnelCheck: number;
  minCheckoutsForCompletionCheck: number;
  minCheckoutCompletion: number;
  spendSpikeMultiple: number;
  consecutiveLossDays: number;
}

export type Severity = "critique" | "alerte" | "info";

export interface Alert {
  code: string;
  severity: Severity;
  date: string;
  message: string;
  value?: number;
  threshold?: number;
}

const DAY_MS = 86_400_000;

function toTime(date: string): number {
  const time = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(time)) throw new RangeError(`Date invalide : ${date}`);
  return time;
}

function windowOf(history: DailyMetrics[], latest: number, days: number): DailyMetrics[] {
  return history.filter((d) => {
    const t = toTime(d.date);
    return t <= latest && t > latest - days * DAY_MS;
  });
}

function sum(rows: DailyMetrics[], key: "adSpend" | "orders" | "revenue" | "refundedOrders"): number {
  return rows.reduce((total, row) => total + row[key], 0);
}

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export function evaluateAlerts(history: DailyMetrics[], t: Thresholds): Alert[] {
  if (history.length === 0) return [];
  const sorted = [...history].sort((a, b) => toTime(a.date) - toTime(b.date));
  const today = sorted[sorted.length - 1]!;
  const latest = toTime(today.date);
  const alerts: Alert[] = [];
  const push = (alert: Omit<Alert, "date">) => alerts.push({ date: today.date, ...alert });

  // Fenêtre de décision publicitaire : 3 jours.
  const last3 = windowOf(sorted, latest, 3);
  const spend3 = sum(last3, "adSpend");
  const orders3 = sum(last3, "orders");
  const revenue3 = sum(last3, "revenue");
  const killSpend = t.killSpendMultiple * t.maxCpa;

  // Dépense cumulée depuis la dernière vente (30 jours au plus). À CPA réel = CPA max, dépenser 3 × CPA max
  // sans vente n'arrive qu'environ 5 fois sur 100 (loi de Poisson) : au-delà, la publicité n'est presque sûrement pas rentable.
  const lastSale = sorted.map((d) => d.orders > 0).lastIndexOf(true);
  const spendSinceSale = sorted
    .slice(lastSale + 1)
    .filter((d) => toTime(d.date) > latest - 30 * DAY_MS)
    .reduce((total, d) => total + d.adSpend, 0);
  if (spendSinceSale >= killSpend) {
    push({
      code: "KILL_NO_SALES",
      severity: "critique",
      message: `${eur(spendSinceSale)} dépensés depuis la dernière vente (seuil d'arrêt ${eur(killSpend)}) : couper la publicité testée.`,
      value: spendSinceSale,
      threshold: killSpend,
    });
  }
  if (orders3 > 0) {
    const cpa = spend3 / orders3;
    if (cpa > t.maxCpa) {
      push({
        code: "CPA_ABOVE_MAX",
        severity: "alerte",
        message: `CPA sur 3 jours ${eur(cpa)} au-dessus du CPA maximal ${eur(t.maxCpa)} : chaque vente fait perdre de l'argent.`,
        value: cpa,
        threshold: t.maxCpa,
      });
    }
    if (spend3 > 0) {
      const roas = revenue3 / spend3;
      if (roas < t.breakEvenRoas) {
        push({
          code: "ROAS_BELOW_BREAKEVEN",
          severity: "alerte",
          message: `ROAS sur 3 jours ${roas.toFixed(2)} sous le ROAS de rentabilité ${t.breakEvenRoas.toFixed(2)}.`,
          value: roas,
          threshold: t.breakEvenRoas,
        });
      }
    }
  }

  // Remboursements : 14 jours.
  const last14 = windowOf(sorted, latest, 14);
  const orders14 = sum(last14, "orders");
  if (orders14 >= t.minOrdersForRefundRate) {
    const refundRate = sum(last14, "refundedOrders") / orders14;
    if (refundRate > t.maxRefundRate) {
      push({
        code: "REFUND_RATE_HIGH",
        severity: "alerte",
        message: `Taux de remboursement sur 14 jours ${pct(refundRate)} (limite ${pct(t.maxRefundRate)}) : vérifier qualité produit, délais et promesse de la page.`,
        value: refundRate,
        threshold: t.maxRefundRate,
      });
    }
  }

  // Entonnoir du jour.
  if (today.sessions >= t.minSessionsForFunnelCheck && today.addToCarts === 0) {
    push({
      code: "NO_ADD_TO_CART",
      severity: "critique",
      message: `${today.sessions} sessions et aucun ajout au panier : page produit, prix ou bouton d'achat bloquant.`,
      value: today.sessions,
      threshold: t.minSessionsForFunnelCheck,
    });
  }
  if (today.checkoutsReached >= t.minCheckoutsForCompletionCheck) {
    const completion = today.checkoutsCompleted / today.checkoutsReached;
    if (completion < t.minCheckoutCompletion) {
      push({
        code: "CHECKOUT_DROP",
        severity: "critique",
        message: `Seulement ${pct(completion)} des paiements commencés aboutissent : vérifier frais de port, moyens de paiement et erreurs de caisse.`,
        value: completion,
        threshold: t.minCheckoutCompletion,
      });
    }
  }

  // Pic de dépense contre la moyenne des 7 jours précédents.
  const previous7 = windowOf(sorted, latest - DAY_MS, 7);
  if (previous7.length >= 3) {
    const average = sum(previous7, "adSpend") / previous7.length;
    if (average > 0 && today.adSpend > t.spendSpikeMultiple * average) {
      push({
        code: "SPEND_SPIKE",
        severity: "alerte",
        message: `Dépense du jour ${eur(today.adSpend)}, plus de ${t.spendSpikeMultiple} fois la moyenne des 7 jours précédents (${eur(average)}).`,
        value: today.adSpend,
        threshold: t.spendSpikeMultiple * average,
      });
    }
  }

  // Pertes consécutives.
  const lastN = windowOf(sorted, latest, t.consecutiveLossDays);
  if (
    lastN.length === t.consecutiveLossDays &&
    lastN.every((d) => typeof d.netProfit === "number" && d.netProfit < 0)
  ) {
    push({
      code: "CONSECUTIVE_LOSSES",
      severity: "alerte",
      message: `${t.consecutiveLossDays} jours de suite en perte nette : revoir offre, créations ou budget.`,
      value: t.consecutiveLossDays,
    });
  }

  if ((today.unfulfilledOver48h ?? 0) > 0) {
    push({
      code: "FULFILLMENT_DELAY",
      severity: "critique",
      message: `${today.unfulfilledOver48h} commande(s) payée(s) non expédiée(s) depuis plus de 48 h : vérifier DSers et le fournisseur.`,
      value: today.unfulfilledOver48h,
    });
  }

  return alerts;
}
