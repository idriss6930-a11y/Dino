import type { Offer, UnitEconomics } from "./unitEconomics";

/**
 * Simulation d'une campagne d'acquisition jour par jour (espérance, pas de hasard).
 *
 * Trésorerie : la régie et le fournisseur sont payés le jour de la commande, Shopify verse
 * le CA (net de frais) `payoutDelayDays` jours plus tard, les cotisations sur le CA sont
 * réglées tous les 30 jours. Le besoin de trésorerie est le point le plus bas de la courbe.
 */
export interface CampaignInput {
  offer: Offer;
  unitEconomics: UnitEconomics;
  days: number;
  /** Budget facturé par la régie par jour (HT). */
  dailyAdSpend: number;
  /** Dépense facturée par commande obtenue. */
  cpa: number;
  /** Abonnements et frais fixes mensuels (TVA non récupérable incluse). */
  fixedCostsMonthly: number;
  /** Échantillons, inscriptions, créations publicitaires… payés au départ. */
  oneOffCosts: number;
  /** Délai de versement Shopify Payments, en jours. */
  payoutDelayDays: number;
}

export interface CampaignResult {
  orders: number;
  revenueKept: number;
  adSpendInvoiced: number;
  /** Coût réel de la publicité (TVA autoliquidée non récupérable incluse). */
  adSpendCost: number;
  contribution: number;
  fixedCosts: number;
  oneOffCosts: number;
  netProfit: number;
  peakCashNeed: number;
  /** Trésorerie cumulée en fin de journée, jusqu'au dernier versement attendu. */
  cashByDay: number[];
}

const DAYS_PER_MONTH = 30;

export function simulateCampaign(input: CampaignInput): CampaignResult {
  const { offer, unitEconomics: ue } = input;
  if (!Number.isFinite(input.cpa) || input.cpa <= 0) {
    throw new RangeError(`cpa doit être strictement positif (reçu ${input.cpa})`);
  }
  if (!Number.isInteger(input.days) || input.days <= 0) {
    throw new RangeError(`days doit être un entier strictement positif (reçu ${input.days})`);
  }
  if (!Number.isInteger(input.payoutDelayDays) || input.payoutDelayDays < 0) {
    throw new RangeError(`payoutDelayDays doit être un entier positif ou nul (reçu ${input.payoutDelayDays})`);
  }

  const ordersPerDay = input.dailyAdSpend / input.cpa;
  const horizon = input.days + input.payoutDelayDays;
  const payoutPerOrder = ue.revenueKept - ue.paymentFees - ue.chargebackFees;
  const supplierPerOrder = offer.landedCost + ue.otherCosts;
  const fixedPerDay = input.fixedCostsMonthly / DAYS_PER_MONTH;

  const cashByDay: number[] = [];
  let cash = -input.oneOffCosts;
  let lowest = cash;
  let accruedCharges = 0;
  let recoveredOnRefunds = 0;

  for (let day = 0; day < horizon; day++) {
    const selling = day < input.days;
    if (selling) {
      cash -= input.dailyAdSpend * ue.adCostMultiplier;
      cash -= ordersPerDay * supplierPerOrder;
      cash -= fixedPerDay;
      accruedCharges += ordersPerDay * ue.turnoverCharges;
      recoveredOnRefunds += ordersPerDay * (offer.landedCost - ue.landedCostExpected);
    }
    const payoutDay = day - input.payoutDelayDays;
    if (payoutDay >= 0 && payoutDay < input.days) {
      cash += ordersPerDay * payoutPerOrder;
    }
    const isLastDay = day === horizon - 1;
    if ((day + 1) % DAYS_PER_MONTH === 0 || isLastDay) {
      cash -= accruedCharges;
      accruedCharges = 0;
    }
    if (isLastDay) {
      cash += recoveredOnRefunds;
    }
    cashByDay.push(cash);
    lowest = Math.min(lowest, cash);
  }

  const orders = ordersPerDay * input.days;
  const adSpendInvoiced = input.dailyAdSpend * input.days;
  const adSpendCost = adSpendInvoiced * ue.adCostMultiplier;
  const contribution = orders * ue.contributionBeforeAds;
  const fixedCosts = fixedPerDay * input.days;

  return {
    orders,
    revenueKept: orders * ue.revenueKept,
    adSpendInvoiced,
    adSpendCost,
    contribution,
    fixedCosts,
    oneOffCosts: input.oneOffCosts,
    netProfit: contribution - adSpendCost - fixedCosts - input.oneOffCosts,
    peakCashNeed: Math.max(0, -lowest),
    cashByDay,
  };
}
