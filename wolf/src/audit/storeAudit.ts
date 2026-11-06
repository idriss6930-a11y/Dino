/**
 * Audit automatique de conformité et de cohérence d'une boutique Shopify (marché français).
 * Entrée : un instantané normalisé (voir src/shopify/snapshot.ts). Sortie : constats classés.
 * Ce module ne remplace pas un avis juridique : il signale ce qui doit être vérifié ou corrigé.
 */

export interface VariantSnapshot {
  title: string;
  price: number;
  compareAtPrice: number | null;
  unitCost: number | null;
  weightKg: number;
  inventoryTracked: boolean;
  inventoryPolicy: "DENY" | "CONTINUE";
}

export interface ProductSnapshot {
  id: string;
  title: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  descriptionHtml: string;
  seoDescription?: string | null;
  variants: VariantSnapshot[];
}

export interface ShippingRateSnapshot {
  zone: string;
  name: string;
  price: number;
  minOrderTotal?: number | null;
  maxOrderTotal?: number | null;
}

export interface PageSnapshot {
  handle: string;
  title: string;
  isPublished: boolean;
}

export interface StoreSnapshot {
  shop: { name: string; description?: string | null; currency: string };
  products: ProductSnapshot[];
  shippingRates: ShippingRateSnapshot[];
  pages: PageSnapshot[];
}

export interface AuditOptions {
  /** Le fournisseur expédie lui-même (DSers/AliExpress) : la boutique ne maîtrise ni transporteur ni délai. */
  dropshipping: boolean;
}

export type FindingSeverity = "critique" | "alerte" | "info";

export interface Finding {
  code: string;
  severity: FindingSeverity;
  message: string;
  fix: string;
}

const FREE_SHIPPING_CLAIM = /livraison\s+(incluse|offerte|gratuite)|frais\s+de\s+port\s+(offerts|inclus|gratuits)|free\s+shipping/i;
const EXPRESS_RATE = /express|prioritaire|24\s?h|48\s?h|chronopost|rapide/i;
const MEDICAL_PATTERNS = [
  /soulag/i,
  /gu[ée]ri/i,
  /th[ée]rapeuti/i,
  /\bdouleurs?\b/i,
  /apn[ée]e/i,
  /ronflements?/i,
  /insomnies?/i,
  /cervicalgie|migraine|arthrose|hernie/i,
  /recommand[ée]e?s?\s+par\s+(les\s+)?(m[ée]decins|kin[ée]s?|ost[ée]opathes)/i,
];
const MANUFACTURER = /fabricant|fabriqu[ée]\s+par|importateur|personne\s+responsable|responsable\s+(dans\s+l['’]ue|ue)/i;
const SAFETY = /avertissement|pr[ée]caution|consignes?\s+de\s+s[ée]curit[ée]/i;

const LEGAL_PAGES: { label: string; pattern: RegExp }[] = [
  { label: "mentions légales", pattern: /mentions[-\s]l[ée]gales/i },
  { label: "conditions générales de vente", pattern: /\bcgv\b|conditions\s+g[ée]n[ée]rales\s+de\s+vente/i },
  { label: "politique de confidentialité", pattern: /confidentialit|privacy/i },
  { label: "formulaire de rétractation", pattern: /renoncer|r[ée]tractation|withdrawal/i },
];

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function applies(rate: ShippingRateSnapshot, orderTotal: number): boolean {
  return (rate.minOrderTotal ?? 0) <= orderTotal && (rate.maxOrderTotal == null || orderTotal <= rate.maxOrderTotal);
}

export function auditStore(snapshot: StoreSnapshot, options: AuditOptions): Finding[] {
  const findings: Finding[] = [];
  const active = snapshot.products.filter((p) => p.status === "ACTIVE");
  const activeVariants = active.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })));

  // 1. Promesse « livraison incluse » contredite par la caisse.
  const claimTexts = [snapshot.shop.description ?? "", ...active.flatMap((p) => [stripHtml(p.descriptionHtml), p.seoDescription ?? ""])];
  if (claimTexts.some((text) => FREE_SHIPPING_CLAIM.test(text))) {
    const zones = [...new Set(snapshot.shippingRates.map((r) => r.zone))];
    const contradictions: string[] = [];
    for (const { product, variant } of activeVariants) {
      for (const zone of zones) {
        const applicable = snapshot.shippingRates.filter((r) => r.zone === zone && applies(r, variant.price));
        if (applicable.length === 0) continue;
        const cheapest = Math.min(...applicable.map((r) => r.price));
        if (cheapest > 0) {
          contradictions.push(`${product.title} – ${variant.title} (${eur(variant.price)}) : ${eur(cheapest)} de port en ${zone}`);
        }
      }
    }
    if (contradictions.length > 0) {
      findings.push({
        code: "FREE_SHIPPING_CLAIM_MISMATCH",
        severity: "critique",
        message: `La boutique annonce une livraison incluse mais la caisse facture des frais : ${contradictions.join(" ; ")}.`,
        fix: "Aligner les tarifs de livraison sur la promesse affichée (ou corriger tous les textes) : une promesse contredite au paiement est une pratique commerciale trompeuse et une cause majeure d'abandon de panier.",
      });
    }
  }

  // 2. Livraison express non maîtrisée en dropshipping.
  if (options.dropshipping) {
    const express = snapshot.shippingRates.filter((r) => EXPRESS_RATE.test(r.name));
    if (express.length > 0) {
      findings.push({
        code: "UNGUARANTEED_EXPRESS",
        severity: "alerte",
        message: `Tarif(s) rapide(s) proposé(s) alors que le fournisseur choisit le transporteur : ${express.map((r) => `${r.name} ${eur(r.price)}`).join(", ")}.`,
        fix: "Supprimer l'option ou ne la proposer qu'avec un délai réellement garanti par le fournisseur.",
      });
    }
  }

  // 3. Coûts unitaires manquants.
  const noCost = activeVariants.filter(({ variant }) => variant.unitCost == null);
  if (noCost.length > 0) {
    findings.push({
      code: "MISSING_UNIT_COST",
      severity: "alerte",
      message: `Coût unitaire absent pour ${noCost.map(({ product, variant }) => `${product.title} – ${variant.title}`).join(", ")}.`,
      fix: "Saisir le coût fournisseur livré (prix DSers + port) dans chaque variante : sans lui, aucun calcul de marge ni alerte de rentabilité fiable.",
    });
  }

  // 4. Poids nuls.
  const noWeight = activeVariants.filter(({ variant }) => !(variant.weightKg > 0));
  if (noWeight.length > 0) {
    findings.push({
      code: "ZERO_WEIGHT",
      severity: "info",
      message: `Poids à 0 kg pour ${noWeight.length} variante(s).`,
      fix: "Renseigner le poids expédié réel (utile pour les tarifs au poids, Google Shopping et les déclarations).",
    });
  }

  // 5. Stock suivi sur un produit en dropshipping.
  if (options.dropshipping) {
    const tracked = activeVariants.filter(({ variant }) => variant.inventoryTracked && variant.inventoryPolicy === "DENY");
    if (tracked.length > 0) {
      findings.push({
        code: "TRACKED_INVENTORY_DROPSHIPPING",
        severity: "info",
        message: `${tracked.length} variante(s) avec stock suivi et vente bloquée à 0 alors que le stock réel est celui du fournisseur.`,
        fix: "Synchroniser le stock depuis DSers ou désactiver le suivi, pour éviter une rupture artificielle (ou une vente sans stock réel).",
      });
    }
  }

  // 6. Prix barrés (directive Omnibus : prix de référence = prix le plus bas des 30 derniers jours).
  const strike = activeVariants.filter(({ variant }) => variant.compareAtPrice != null && variant.compareAtPrice > variant.price);
  if (strike.length > 0) {
    findings.push({
      code: "STRIKE_THROUGH_PRICE",
      severity: "alerte",
      message: `Prix barré affiché sur ${strike.map(({ product, variant }) => `${product.title} – ${variant.title}`).join(", ")}.`,
      fix: "Ne barrer qu'un prix réellement pratiqué : le prix de référence d'une réduction est le prix le plus bas des 30 jours précédents. Conserver la preuve.",
    });
  }

  // 7. Allégations thérapeutiques.
  for (const product of active) {
    const text = `${stripHtml(product.descriptionHtml)} ${product.seoDescription ?? ""}`;
    const hits = MEDICAL_PATTERNS.filter((pattern) => pattern.test(text));
    if (hits.length > 0) {
      findings.push({
        code: "MEDICAL_CLAIM",
        severity: "alerte",
        message: `« ${product.title} » contient un vocabulaire thérapeutique (${hits.length} motif(s)).`,
        fix: "Rester sur le confort et l'usage : une promesse de soin peut faire du produit un dispositif médical (règlement UE 2017/745) et fait refuser les publicités.",
      });
    }
  }

  // 8. Informations GPSR (règlement UE 2023/988) sur la fiche produit.
  for (const product of active) {
    const text = stripHtml(product.descriptionHtml);
    const missing: string[] = [];
    if (!MANUFACTURER.test(text)) missing.push("fabricant et personne responsable dans l'UE (nom, adresse postale et électronique)");
    if (!SAFETY.test(text)) missing.push("avertissements et consignes de sécurité en français");
    if (missing.length > 0) {
      findings.push({
        code: "GPSR_INFO_MISSING",
        severity: "alerte",
        message: `« ${product.title} » : il manque ${missing.join(" ; ")}.`,
        fix: "Ajouter un bloc « Sécurité et fabricant » : identité et coordonnées du fabricant, personne responsable dans l'UE, référence du produit, avertissements.",
      });
    }
  }

  // 9. Pages légales obligatoires.
  const published = snapshot.pages.filter((p) => p.isPublished);
  for (const { label, pattern } of LEGAL_PAGES) {
    if (!published.some((p) => pattern.test(p.handle) || pattern.test(p.title))) {
      findings.push({
        code: "MISSING_LEGAL_PAGE",
        severity: "critique",
        message: `Page obligatoire introuvable : ${label}.`,
        fix: `Publier la page « ${label} » et la lier dans le pied de page.`,
      });
    }
  }

  return findings;
}
