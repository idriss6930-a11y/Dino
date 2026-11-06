import { describe, expect, it } from "vitest";
import { createShopifyClient } from "../src/shopify/client";
import { toStoreSnapshot } from "../src/shopify/snapshot";
import { rawSnapshotResponse } from "./fixtures/shopifyRaw";

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Call[] = [];
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error("no more fake responses");
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { "content-type": "application/json" } });
  };
  return { calls, fetchImpl };
}

const noSleep = async () => {};

describe("createShopifyClient", () => {
  it("posts the query with the access token to the versioned Admin endpoint", async () => {
    const { calls, fetchImpl } = fakeFetch([{ status: 200, body: { data: { shop: { name: "Nuitalys" } } } }]);
    const client = createShopifyClient({ shopDomain: "a0rerd-xb.myshopify.com", accessToken: "shpat_test", apiVersion: "2026-10", fetchImpl, sleep: noSleep });
    const data = await client.query<{ shop: { name: string } }>("{ shop { name } }");
    expect(data.shop.name).toBe("Nuitalys");
    expect(calls[0]?.url).toBe("https://a0rerd-xb.myshopify.com/admin/api/2026-10/graphql.json");
    expect(new Headers(calls[0]?.init.headers).get("X-Shopify-Access-Token")).toBe("shpat_test");
  });

  it("retries after HTTP 429 and returns the eventual data", async () => {
    const { calls, fetchImpl } = fakeFetch([
      { status: 429, body: {} },
      { status: 429, body: {} },
      { status: 200, body: { data: { ok: true } } },
    ]);
    const client = createShopifyClient({ shopDomain: "x.myshopify.com", accessToken: "t", fetchImpl, sleep: noSleep });
    await expect(client.query("{ ok }")).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(3);
  });

  it("retries a THROTTLED GraphQL error", async () => {
    const { fetchImpl } = fakeFetch([
      { status: 200, body: { errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] } },
      { status: 200, body: { data: { ok: 1 } } },
    ]);
    const client = createShopifyClient({ shopDomain: "x.myshopify.com", accessToken: "t", fetchImpl, sleep: noSleep });
    await expect(client.query("{ ok }")).resolves.toEqual({ ok: 1 });
  });

  it("fails fast on a non-retryable GraphQL error", async () => {
    const { calls, fetchImpl } = fakeFetch([{ status: 200, body: { errors: [{ message: "Field 'nope' doesn't exist" }] } }]);
    const client = createShopifyClient({ shopDomain: "x.myshopify.com", accessToken: "t", fetchImpl, sleep: noSleep });
    await expect(client.query("{ nope }")).rejects.toThrow(/nope/);
    expect(calls).toHaveLength(1);
  });

  it("gives up after the maximum number of attempts", async () => {
    const { fetchImpl } = fakeFetch(Array.from({ length: 5 }, () => ({ status: 503, body: {} })));
    const client = createShopifyClient({ shopDomain: "x.myshopify.com", accessToken: "t", fetchImpl, sleep: noSleep, maxAttempts: 3 });
    await expect(client.query("{ ok }")).rejects.toThrow(/503/);
  });

  it("refuses to start without a shop domain or token", () => {
    expect(() => createShopifyClient({ shopDomain: "", accessToken: "t" })).toThrow(/SHOPIFY_SHOP_DOMAIN/);
    expect(() => createShopifyClient({ shopDomain: "x.myshopify.com", accessToken: "" })).toThrow(/SHOPIFY_ADMIN_TOKEN/);
  });
});

describe("toStoreSnapshot", () => {
  const snapshot = toStoreSnapshot(rawSnapshotResponse);

  it("maps variant prices, costs, weights and inventory settings", () => {
    const [single, duo] = snapshot.products[0]!.variants;
    expect(single).toEqual({ title: "1 oreiller", price: 59, compareAtPrice: null, unitCost: null, weightKg: 0, inventoryTracked: true, inventoryPolicy: "DENY" });
    expect(duo?.unitCost).toBe(36.5);
    expect(duo?.weightKg).toBeCloseTo(2.6, 6);
    expect(duo?.compareAtPrice).toBe(120);
  });

  it("turns price conditions into minimum order totals and ignores inactive rates", () => {
    expect(snapshot.shippingRates).toEqual([
      { zone: "France", name: "Standard", price: 7.99, minOrderTotal: null, maxOrderTotal: null },
      { zone: "France", name: "Standard", price: 0, minOrderTotal: 65, maxOrderTotal: null },
      { zone: "France", name: "Express", price: 10.99, minOrderTotal: null, maxOrderTotal: null },
    ]);
  });

  it("keeps the SEO description and page publication state", () => {
    expect(snapshot.products[0]?.seoDescription).toContain("livraison incluse");
    expect(snapshot.pages).toEqual([
      { handle: "cgv", title: "Conditions générales de vente", isPublished: true },
      { handle: "brouillon", title: "Brouillon", isPublished: false },
    ]);
  });
});
