/** Construction des requêtes eBay (Sell Inventory API). Fonctions pures, testées sans réseau. */
import type { Condition } from "@/lib/listing/constants";
import { fitTitle } from "@/lib/listing/rules";
import type { ItemFacts, ListingText } from "@/lib/listing/types";

export const EBAY_MARKETPLACE = "EBAY_FR";

/** Dans les catégories vêtements, eBay n'accepte qu'un seul état d'occasion (« USED_EXCELLENT » = d'occasion). */
export const EBAY_CONDITION: Record<Condition, string> = { new_tags: "NEW", new: "NEW_OTHER", very_good: "USED_EXCELLENT", good: "USED_EXCELLENT", fair: "USED_EXCELLENT" };

export const skuFor = (itemId: string) => `placard-${itemId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 36)}`;

export function inventoryItemPayload(text: ListingText, facts: ItemFacts, imageUrls: string[]) {
  const aspects: Record<string, string[]> = {};
  const add = (name: string, value: string) => value.trim() && (aspects[name] = [value.trim()]);
  add("Marque", facts.brand || "Sans marque");
  add("Taille", facts.size);
  add("Couleur", facts.color);
  add("Matière", facts.material);
  return {
    availability: { shipToLocationAvailability: { quantity: 1 } },
    condition: EBAY_CONDITION[facts.condition],
    ...(facts.defects.trim() && facts.condition !== "new_tags" && facts.condition !== "new" ? { conditionDescription: facts.defects.trim().slice(0, 1000) } : {}),
    product: { title: fitTitle(text.title), description: text.description, aspects, imageUrls: imageUrls.slice(0, 12) },
  };
}

export type EbayPolicies = { fulfillmentPolicyId: string; paymentPolicyId: string; returnPolicyId: string };

export function offerPayload(o: { sku: string; categoryId: string; priceCents: number; description: string; merchantLocationKey: string; policies: EbayPolicies }) {
  return {
    sku: o.sku,
    marketplaceId: EBAY_MARKETPLACE,
    format: "FIXED_PRICE",
    availableQuantity: 1,
    categoryId: o.categoryId,
    listingDescription: o.description.replace(/\n/g, "<br>"),
    listingPolicies: o.policies,
    pricingSummary: { price: { value: (o.priceCents / 100).toFixed(2), currency: "EUR" } },
    merchantLocationKey: o.merchantLocationKey,
  };
}

/** Message lisible à partir d'une réponse d'erreur eBay ({ errors: [{ message, longMessage }] }). */
export function ebayErrorMessage(body: unknown): string | null {
  const errors = (body as { errors?: Array<{ message?: string; longMessage?: string }> } | null)?.errors;
  const first = errors?.[0];
  return first ? (first.longMessage || first.message || null) : null;
}
