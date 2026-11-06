import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fetchMetaDailySpend } from "../ads/meta";
import { loadBusinessConfig, loadOffersConfig, projectPath } from "../lib/config";
import { argValue } from "../lib/format";
import { dayInZone, FUNNEL_SHOPIFYQL, ORDERS_QUERY, toFunnelRows, type AdSpendRow, type RawOrder } from "../pnl/daily";
import { buildDailyReport, type AlertsConfig } from "../pnl/report";
import { createShopifyClient } from "../shopify/client";

const started = Date.now();
const outDir = projectPath("out");
mkdirSync(outDir, { recursive: true });
const log = (entry: Record<string, unknown>) => appendFileSync(projectPath("out/runs.log"), `${JSON.stringify({ ts: new Date().toISOString(), command: "report", ...entry })}\n`);

try {
  const business = loadBusinessConfig();
  const offers = loadOffersConfig();
  const alertsConfig = JSON.parse(readFileSync(projectPath("config/alerts.json"), "utf8")) as AlertsConfig;
  const span = Number(argValue("days", "14"));
  const now = new Date();
  const days = Array.from({ length: span }, (_, i) => dayInZone(new Date(now.getTime() - (span - 1 - i) * 86_400_000), business.timeZone));
  const since = days[0]!;
  const until = days[days.length - 1]!;

  const shopify = createShopifyClient({ shopDomain: process.env.SHOPIFY_SHOP_DOMAIN ?? "", accessToken: process.env.SHOPIFY_ADMIN_TOKEN ?? "", apiVersion: process.env.SHOPIFY_API_VERSION });

  const rawOrders: RawOrder[] = [];
  let after: string | null = null;
  do {
    const page: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; edges: { node: RawOrder }[] } } =
      await shopify.query(ORDERS_QUERY, { q: `created_at:>='${since}T00:00:00+01:00'`, after });
    rawOrders.push(...page.orders.edges.map((e) => e.node));
    after = page.orders.pageInfo.hasNextPage ? page.orders.pageInfo.endCursor : null;
  } while (after);

  const funnelData: { shopifyqlQuery: { parseErrors: string[]; tableData: { rows: Record<string, string>[] } | null } } = await shopify.query(
    `query Funnel($q: String!) { shopifyqlQuery(query: $q) { parseErrors tableData { rows } } }`,
    { q: FUNNEL_SHOPIFYQL(since, until) },
  );
  const funnel = toFunnelRows(funnelData.shopifyqlQuery.tableData?.rows ?? []);

  const ads: AdSpendRow[] = [];
  if (process.env.META_AD_ACCOUNT_ID && process.env.META_ACCESS_TOKEN) {
    ads.push(...(await fetchMetaDailySpend({ adAccountId: process.env.META_AD_ACCOUNT_ID, accessToken: process.env.META_ACCESS_TOKEN, since, until, graphVersion: process.env.META_GRAPH_VERSION })));
  }

  const report = buildDailyReport({ business, offers, alertsConfig, rawOrders, funnel, ads, days, now });
  writeFileSync(projectPath(`out/report-${until}.md`), report.markdown);
  writeFileSync(projectPath(`out/report-${until}.json`), JSON.stringify(report, null, 2));
  console.log(report.markdown);

  if (process.env.ALERT_WEBHOOK_URL && report.alerts.length > 0) {
    const text = `THE WOLF — ${report.alerts.length} alerte(s) :\n${report.alerts.map((a) => `• [${a.severity}] ${a.message}`).join("\n")}`;
    await fetch(process.env.ALERT_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, content: text }) });
  }
  log({ status: "ok", ms: Date.now() - started, orders: report.totals.orders, alerts: report.alerts.map((a) => a.code), metaConnected: ads.length > 0 });
  process.exitCode = report.alerts.some((a) => a.severity === "critique") ? 2 : 0;
} catch (error) {
  log({ status: "error", ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
