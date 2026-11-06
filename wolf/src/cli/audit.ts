import { readFileSync } from "node:fs";
import { auditStore, type StoreSnapshot } from "../audit/storeAudit";
import { createShopifyClient } from "../shopify/client";
import { fetchStoreSnapshot } from "../shopify/snapshot";
import { argValue } from "../lib/format";

const snapshotPath = argValue("snapshot");
const snapshot: StoreSnapshot = snapshotPath
  ? (JSON.parse(readFileSync(snapshotPath, "utf8")) as StoreSnapshot)
  : await fetchStoreSnapshot(
      createShopifyClient({
        shopDomain: process.env.SHOPIFY_SHOP_DOMAIN ?? "",
        accessToken: process.env.SHOPIFY_ADMIN_TOKEN ?? "",
        apiVersion: process.env.SHOPIFY_API_VERSION,
      }),
    );

const findings = auditStore(snapshot, { dropshipping: process.env.WOLF_DROPSHIPPING !== "false" });
const icon = { critique: "🔴", alerte: "🟠", info: "🔵" } as const;
console.log(`# Audit boutique — ${snapshot.shop.name} — ${new Date().toISOString()}\n`);
if (findings.length === 0) console.log("Aucun constat.");
for (const f of findings) console.log(`- ${icon[f.severity]} **${f.code}** — ${f.message}\n  → ${f.fix}`);
process.exitCode = findings.some((f) => f.severity === "critique") ? 1 : 0;
