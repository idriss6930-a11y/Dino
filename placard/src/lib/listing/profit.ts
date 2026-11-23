/** Calculs d'argent : frais estimés, bénéfice net, prix plancher. Tout en centimes entiers. */
import type { PlatformId } from "./constants";
import { PLATFORMS } from "./platforms";

export function estimateFeesCents(platform: PlatformId | "other", priceCents: number): number {
  if (platform === "other") return 0;
  const p = PLATFORMS[platform];
  if (priceCents <= 0) return 0;
  return Math.round((priceCents * p.feePct) / 100) + p.feeFixedCents;
}

/** Ce qui reste en poche : prix de vente, moins les frais, l'envoi payé par le vendeur et le prix d'achat. */
export function netProfitCents(sale: { soldCents: number; feesCents?: number | null; shippingCents?: number | null; purchaseCents?: number | null }): number {
  return sale.soldCents - (sale.feesCents ?? 0) - (sale.shippingCents ?? 0) - (sale.purchaseCents ?? 0);
}

/**
 * Prix minimum à afficher pour atteindre une marge donnée sur le prix d'achat, après frais estimés.
 * marginPct = 0 donne le seuil où l'on ne perd pas d'argent. Arrondi au demi-euro supérieur.
 */
export function minPriceCents(purchaseCents: number, platform: PlatformId, marginPct = 0): number {
  const p = PLATFORMS[platform];
  const target = purchaseCents * (1 + marginPct / 100) + p.feeFixedCents;
  const raw = target / (1 - p.feePct / 100);
  return Math.ceil(raw / 50) * 50;
}
