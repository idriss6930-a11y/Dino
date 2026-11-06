import type { ShopifyClient } from "./client";
import type { ProductSnapshot, ShippingRateSnapshot, StoreSnapshot } from "../audit/storeAudit";

/** Requête validée contre le schéma Admin 2026-10 (mêmes champs que l'audit manuel du 06/11/2026). */
export const SNAPSHOT_QUERY = `{
  shop { name currencyCode description }
  products(first: 100) {
    edges { node {
      id title status descriptionHtml seo { description }
      variants(first: 50) { edges { node {
        title price compareAtPrice inventoryPolicy
        inventoryItem { tracked unitCost { amount } measurement { weight { value unit } } }
      } } }
    } }
  }
  deliveryProfiles(first: 10) {
    edges { node { profileLocationGroups { locationGroupZones(first: 50) { edges { node {
      zone { name }
      methodDefinitions(first: 20) { edges { node {
        name active
        rateProvider { ... on DeliveryRateDefinition { price { amount } } }
        methodConditions { field operator conditionCriteria { ... on MoneyV2 { amount } } }
      } } }
    } } } } } }
  }
  pages(first: 100) { edges { node { handle title isPublished } } }
}`;

type Edges<T> = { edges: { node: T }[] };
type Money = { amount: string } | null;

interface RawVariant {
  title: string;
  price: string;
  compareAtPrice: string | null;
  inventoryPolicy: "DENY" | "CONTINUE";
  inventoryItem: { tracked: boolean; unitCost: Money; measurement: { weight: { value: number; unit: string } | null } };
}

interface RawMethod {
  name: string;
  active: boolean;
  rateProvider: { price?: { amount: string } } | null;
  methodConditions: { field: string; operator: string; conditionCriteria: { amount?: string } }[];
}

export interface RawSnapshot {
  shop: { name: string; currencyCode: string; description: string | null };
  products: Edges<{
    id: string;
    title: string;
    status: ProductSnapshot["status"];
    descriptionHtml: string;
    seo: { description: string | null };
    variants: Edges<RawVariant>;
  }>;
  deliveryProfiles: Edges<{
    profileLocationGroups: { locationGroupZones: Edges<{ zone: { name: string }; methodDefinitions: Edges<RawMethod> }> }[];
  }>;
  pages: Edges<{ handle: string; title: string; isPublished: boolean }>;
}

const WEIGHT_TO_KG: Record<string, number> = { KILOGRAMS: 1, GRAMS: 0.001, POUNDS: 0.45359237, OUNCES: 0.028349523125 };

function toKg(weight: { value: number; unit: string } | null): number {
  if (!weight) return 0;
  return weight.value * (WEIGHT_TO_KG[weight.unit] ?? 1);
}

function priceBound(method: RawMethod, operators: string[]): number | null {
  const condition = method.methodConditions.find((c) => c.field === "TOTAL_PRICE" && operators.includes(c.operator));
  return condition?.conditionCriteria.amount != null ? Number(condition.conditionCriteria.amount) : null;
}

export function toStoreSnapshot(raw: RawSnapshot): StoreSnapshot {
  const shippingRates: ShippingRateSnapshot[] = [];
  for (const { node: profile } of raw.deliveryProfiles.edges) {
    for (const group of profile.profileLocationGroups) {
      for (const { node: zoneNode } of group.locationGroupZones.edges) {
        for (const { node: method } of zoneNode.methodDefinitions.edges) {
          if (!method.active || method.rateProvider?.price == null) continue;
          shippingRates.push({
            zone: zoneNode.zone.name,
            name: method.name,
            price: Number(method.rateProvider.price.amount),
            minOrderTotal: priceBound(method, ["GREATER_THAN_OR_EQUAL_TO"]),
            maxOrderTotal: priceBound(method, ["LESS_THAN_OR_EQUAL_TO"]),
          });
        }
      }
    }
  }

  return {
    shop: { name: raw.shop.name, description: raw.shop.description, currency: raw.shop.currencyCode },
    products: raw.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      status: node.status,
      descriptionHtml: node.descriptionHtml,
      seoDescription: node.seo.description,
      variants: node.variants.edges.map(({ node: v }) => ({
        title: v.title,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice == null ? null : Number(v.compareAtPrice),
        unitCost: v.inventoryItem.unitCost == null ? null : Number(v.inventoryItem.unitCost.amount),
        weightKg: toKg(v.inventoryItem.measurement.weight),
        inventoryTracked: v.inventoryItem.tracked,
        inventoryPolicy: v.inventoryPolicy,
      })),
    })),
    shippingRates,
    pages: raw.pages.edges.map(({ node }) => ({ handle: node.handle, title: node.title, isPublished: node.isPublished })),
  };
}

export async function fetchStoreSnapshot(client: ShopifyClient): Promise<StoreSnapshot> {
  return toStoreSnapshot(await client.query<RawSnapshot>(SNAPSHOT_QUERY));
}
