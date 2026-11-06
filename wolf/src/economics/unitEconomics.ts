/**
 * Économie unitaire d'une offre (produit ou lot) — espérance par commande passée.
 *
 * Modèle :
 *  - CA conservé = prix × (1 − taux de remboursement − taux d'impayés/litiges)
 *  - Coût produit attendu = coût débarqué − part récupérée sur les retours revendables
 *  - Frais de paiement prélevés sur la transaction initiale (non rendus en cas de remboursement)
 *  - Charges sur CA (micro-entreprise) calculées sur le CA conservé
 *  - Publicité : en franchise de TVA, la TVA autoliquidée sur les factures Meta/Google/TikTok
 *    n'est pas récupérable → chaque euro facturé coûte (1 + taux de TVA).
 */

export type VatRegime = "franchise" | "standard";

export interface BusinessParams {
  vatRegime: VatRegime;
  /** Taux normal de TVA (France : 0,20). */
  vatRate: number;
  /** Cotisations assises sur le CA (micro BIC vente : 12,3 % + CFP 0,1 % ; + 1 % si versement libératoire). 0 en société. */
  turnoverChargeRate: number;
  paymentFeePct: number;
  paymentFeeFixed: number;
  /** Part des commandes remboursées intégralement (rétractation, non-conformité). */
  refundRate: number;
  /** Part du coût produit récupérée quand un article remboursé est revendable. */
  refundCostRecoveryRate: number;
  /** Part des commandes perdues en litige bancaire (chargeback). */
  chargebackRate: number;
  chargebackFee: number;
  /** Service client, frais d'apps à la commande, etc. */
  otherVariableCostPerOrder: number;
  /** false en franchise de TVA : la TVA autoliquidée sur la publicité est un coût. */
  adVatRecoverable: boolean;
}

export interface Offer {
  id: string;
  name: string;
  /** Prix payé par le client, TTC (en franchise : pas de TVA facturée). */
  price: number;
  /** Coût fournisseur livré chez le client (produit + transport), pour toute l'offre. */
  landedCost: number;
  packagingCost?: number;
  /** Droits et frais d'import par commande (envoi hors UE : 3 € de droit + 2 € de frais par article). */
  customsPerOrder?: number;
  /** Frais de port payés par le client (0 si livraison incluse). */
  shippingCharged?: number;
  /** Éco-contribution REP par commande (Ecomaison : ~0,35 € par oreiller, à confirmer). */
  ecoContribution?: number;
}

export interface UnitEconomics {
  offerId: string;
  revenueNet: number;
  revenueKept: number;
  landedCostExpected: number;
  otherCosts: number;
  paymentFees: number;
  turnoverCharges: number;
  chargebackFees: number;
  contributionBeforeAds: number;
  contributionRate: number;
  grossMarginRate: number;
  adCostMultiplier: number;
  /** Dépense publicitaire maximale par commande (montant facturé HT par la régie) pour finir à 0 €. */
  maxCpa: number;
  /** ROAS « régie » (valeur d'achat / dépense facturée) à partir duquel la commande est rentable. */
  breakEvenRoas: number;
}

function assertRate(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} doit être compris entre 0 et 1 (reçu ${value})`);
  }
}

function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} doit être un nombre positif ou nul (reçu ${value})`);
  }
}

export function computeUnitEconomics(offer: Offer, params: BusinessParams): UnitEconomics {
  if (!Number.isFinite(offer.price) || offer.price <= 0) {
    throw new RangeError(`price doit être strictement positif (reçu ${offer.price})`);
  }
  assertNonNegative("landedCost", offer.landedCost);
  assertNonNegative("packagingCost", offer.packagingCost ?? 0);
  assertNonNegative("customsPerOrder", offer.customsPerOrder ?? 0);
  assertNonNegative("shippingCharged", offer.shippingCharged ?? 0);
  assertNonNegative("ecoContribution", offer.ecoContribution ?? 0);
  for (const key of ["vatRate", "turnoverChargeRate", "paymentFeePct", "refundRate", "refundCostRecoveryRate", "chargebackRate"] as const) {
    assertRate(key, params[key]);
  }
  assertNonNegative("paymentFeeFixed", params.paymentFeeFixed);
  assertNonNegative("chargebackFee", params.chargebackFee);
  assertNonNegative("otherVariableCostPerOrder", params.otherVariableCostPerOrder);
  if (params.refundRate + params.chargebackRate > 1) {
    throw new RangeError("refundRate + chargebackRate ne peut pas dépasser 1");
  }

  const gross = offer.price + (offer.shippingCharged ?? 0);
  const vatDivisor = params.vatRegime === "standard" ? 1 + params.vatRate : 1;
  const revenueNet = gross / vatDivisor;
  const revenueKept = revenueNet * (1 - params.refundRate - params.chargebackRate);

  const landedCostExpected =
    offer.landedCost - params.refundRate * params.refundCostRecoveryRate * offer.landedCost;
  const otherCosts =
    (offer.packagingCost ?? 0) + (offer.customsPerOrder ?? 0) + (offer.ecoContribution ?? 0) + params.otherVariableCostPerOrder;
  const paymentFees = gross * params.paymentFeePct + params.paymentFeeFixed;
  const turnoverCharges = revenueKept * params.turnoverChargeRate;
  const chargebackFees = params.chargebackRate * params.chargebackFee;

  const contributionBeforeAds =
    revenueKept - landedCostExpected - otherCosts - paymentFees - turnoverCharges - chargebackFees;
  const adCostMultiplier = params.adVatRecoverable ? 1 : 1 + params.vatRate;
  const maxCpa = contributionBeforeAds / adCostMultiplier;

  return {
    offerId: offer.id,
    revenueNet,
    revenueKept,
    landedCostExpected,
    otherCosts,
    paymentFees,
    turnoverCharges,
    chargebackFees,
    contributionBeforeAds,
    contributionRate: contributionBeforeAds / revenueNet,
    grossMarginRate: (revenueNet - offer.landedCost) / revenueNet,
    adCostMultiplier,
    maxCpa,
    breakEvenRoas: maxCpa > 0 ? gross / maxCpa : Number.POSITIVE_INFINITY,
  };
}

/** Bénéfice attendu par commande quand la régie facture `cpa` € HT par commande. */
export function profitAtCpa(ue: UnitEconomics, cpa: number): number {
  return ue.contributionBeforeAds - cpa * ue.adCostMultiplier;
}
