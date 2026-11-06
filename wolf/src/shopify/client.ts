/**
 * Client minimal de l'API Admin GraphQL de Shopify (fetch natif, sans dépendance).
 * Réessaie sur 429, 5xx et erreurs THROTTLED avec un délai exponentiel.
 * Le jeton (custom app, accès lecture) vient de SHOPIFY_ADMIN_TOKEN : jamais en dur, jamais commité.
 */

export interface ShopifyClientOptions {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
  maxAttempts?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface ShopifyClient {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

interface GraphqlError {
  message: string;
  extensions?: { code?: string };
}

export const DEFAULT_API_VERSION = "2026-10";

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createShopifyClient(options: ShopifyClientOptions): ShopifyClient {
  if (!options.shopDomain) throw new Error("SHOPIFY_SHOP_DOMAIN manquant (ex. a0rerd-xb.myshopify.com)");
  if (!options.accessToken) throw new Error("SHOPIFY_ADMIN_TOKEN manquant (jeton d'une app personnalisée, droits en lecture)");
  const endpoint = `https://${options.shopDomain}/admin/api/${options.apiVersion ?? DEFAULT_API_VERSION}/graphql.json`;
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  return {
    async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
      let lastError = "";
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": options.accessToken },
          body: JSON.stringify({ query, variables }),
        });
        if (response.status === 429 || response.status >= 500) {
          lastError = `HTTP ${response.status}`;
        } else if (!response.ok) {
          throw new Error(`Shopify Admin API : HTTP ${response.status}`);
        } else {
          const body = (await response.json()) as { data?: T; errors?: GraphqlError[] };
          const errors = body.errors ?? [];
          if (errors.some((e) => e.extensions?.code === "THROTTLED")) {
            lastError = "THROTTLED";
          } else if (errors.length > 0) {
            throw new Error(`Shopify Admin API : ${errors.map((e) => e.message).join(" | ")}`);
          } else if (body.data === undefined) {
            throw new Error("Shopify Admin API : réponse sans données");
          } else {
            return body.data;
          }
        }
        if (attempt < maxAttempts) await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
      throw new Error(`Shopify Admin API : échec après ${maxAttempts} tentatives (${lastError})`);
    },
  };
}
