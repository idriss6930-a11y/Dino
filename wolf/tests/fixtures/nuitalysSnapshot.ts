import type { StoreSnapshot } from "../../src/audit/storeAudit";

/**
 * État réel de nuitalys.fr relevé le 06/11/2026 via l'API Admin, AVANT la correction des tarifs
 * de livraison (données personnelles retirées). Sert de cas de non-régression.
 */
export const nuitalysBeforeFix: StoreSnapshot = {
  shop: {
    name: "Nuitalys",
    description:
      "Un oreiller papillon en mousse à mémoire de forme pour dormir sur le dos ou le côté. 59 €, livraison incluse en France métropolitaine.",
    currency: "EUR",
  },
  products: [
    {
      id: "gid://shopify/Product/16144569401675",
      title: "L'oreiller papillon",
      status: "ACTIVE",
      descriptionHtml:
        "<ul><li>Livraison incluse en France métropolitaine</li><li>14 jours après réception pour changer d'avis</li></ul>" +
        "<p><strong>Un oreiller en mousse à mémoire de forme, dessiné pour ceux qui dorment sur le dos ou sur le côté.</strong></p>" +
        "<ul><li>Dimensions : 64 × 38 × 14 cm</li><li>Fabriqué en Chine, expédié depuis un entrepôt situé en France</li></ul>" +
        "<p>Ce n'est pas un dispositif médical.</p>",
      seoDescription:
        "Oreiller papillon en mousse à mémoire de forme, pour dormir sur le dos ou le côté. 59 €, livraison incluse en France métropolitaine, 14 jours pour changer d'avis.",
      variants: [
        { title: "1 oreiller", price: 59, compareAtPrice: null, unitCost: null, weightKg: 0, inventoryTracked: true, inventoryPolicy: "DENY" },
        { title: "Le Duo (2 oreillers)", price: 99, compareAtPrice: null, unitCost: null, weightKg: 0, inventoryTracked: true, inventoryPolicy: "DENY" },
      ],
    },
  ],
  shippingRates: [
    { zone: "France", name: "Standard", price: 7.99, minOrderTotal: null },
    { zone: "France", name: "Standard", price: 0, minOrderTotal: 65 },
    { zone: "France", name: "Express", price: 10.99, minOrderTotal: null },
  ],
  pages: [
    { handle: "contact", title: "Contact", isPublished: true },
    { handle: "a-propos", title: "À propos", isPublished: true },
    { handle: "faq", title: "Questions fréquentes", isPublished: true },
    { handle: "livraison-retours", title: "Livraison et retours", isPublished: true },
    { handle: "renoncer", title: "Renoncer au contrat ici", isPublished: true },
    { handle: "mentions-legales", title: "Mentions légales", isPublished: true },
    { handle: "cgv", title: "Conditions générales de vente", isPublished: true },
    { handle: "confidentialite", title: "Politique de confidentialité", isPublished: true },
  ],
};

/** Même boutique après la correction du 06/11/2026 : une seule livraison standard incluse. */
export const nuitalysAfterFix: StoreSnapshot = {
  ...nuitalysBeforeFix,
  shippingRates: [{ zone: "France", name: "Livraison standard incluse", price: 0, minOrderTotal: null }],
};
