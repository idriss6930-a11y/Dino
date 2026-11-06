import type { RawSnapshot } from "../../src/shopify/snapshot";

/** Extraits réels (forme exacte) des réponses Admin GraphQL 2026-10 de nuitalys.fr, 06/11/2026, avant correction. */
export const rawSnapshotResponse: RawSnapshot = {
  shop: {
    name: "Nuitalys",
    currencyCode: "EUR",
    description: "Un oreiller papillon en mousse à mémoire de forme pour dormir sur le dos ou le côté. 59 €, livraison incluse en France métropolitaine.",
  },
  products: {
    edges: [
      {
        node: {
          id: "gid://shopify/Product/16144569401675",
          title: "L'oreiller papillon",
          status: "ACTIVE",
          descriptionHtml: "<ul><li>Livraison incluse en France métropolitaine</li></ul>",
          seo: { description: "59 €, livraison incluse en France métropolitaine" },
          variants: {
            edges: [
              {
                node: {
                  title: "1 oreiller",
                  price: "59.00",
                  compareAtPrice: null,
                  inventoryPolicy: "DENY",
                  inventoryItem: { tracked: true, unitCost: null, measurement: { weight: { value: 0, unit: "KILOGRAMS" } } },
                },
              },
              {
                node: {
                  title: "Le Duo (2 oreillers)",
                  price: "99.00",
                  compareAtPrice: "120.00",
                  inventoryPolicy: "DENY",
                  inventoryItem: { tracked: true, unitCost: { amount: "36.5" }, measurement: { weight: { value: 2600, unit: "GRAMS" } } },
                },
              },
            ],
          },
        },
      },
    ],
  },
  deliveryProfiles: {
    edges: [
      {
        node: {
          profileLocationGroups: [
            {
              locationGroupZones: {
                edges: [
                  {
                    node: {
                      zone: { name: "France" },
                      methodDefinitions: {
                        edges: [
                          { node: { name: "Standard", active: true, rateProvider: { price: { amount: "7.99" } }, methodConditions: [] } },
                          {
                            node: {
                              name: "Standard",
                              active: true,
                              rateProvider: { price: { amount: "0.0" } },
                              methodConditions: [{ field: "TOTAL_PRICE", operator: "GREATER_THAN_OR_EQUAL_TO", conditionCriteria: { amount: "65.0" } }],
                            },
                          },
                          { node: { name: "Express", active: true, rateProvider: { price: { amount: "10.99" } }, methodConditions: [] } },
                          { node: { name: "Ancien tarif", active: false, rateProvider: { price: { amount: "4.99" } }, methodConditions: [] } },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  pages: {
    edges: [
      { node: { handle: "cgv", title: "Conditions générales de vente", isPublished: true } },
      { node: { handle: "brouillon", title: "Brouillon", isPublished: false } },
    ],
  },
};
