import type { AdSpendRow } from "../pnl/daily";

/**
 * Dépenses Meta (Facebook/Instagram) par jour via l'API Marketing (Insights), niveau compte publicitaire.
 * Jeton : META_ACCESS_TOKEN (utilisateur système, droit ads_read uniquement). Envoyé en en-tête, jamais dans l'URL.
 * Version : META_GRAPH_VERSION, v26.0 par défaut (dernière version confirmée le 06/11/2026 ; la v24.0 a expiré).
 */
export interface MetaOptions {
  adAccountId: string;
  accessToken: string;
  since: string;
  until: string;
  graphVersion?: string;
  fetchImpl?: typeof fetch;
}

interface ActionValue {
  action_type: string;
  value: string;
}

interface InsightRow {
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: ActionValue[];
  action_values?: ActionValue[];
}

const PURCHASE_TYPES = ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"];

function purchaseMetric(values: ActionValue[] | undefined): number {
  if (!values) return 0;
  for (const type of PURCHASE_TYPES) {
    const match = values.find((v) => v.action_type === type);
    if (match) return Number(match.value);
  }
  return 0;
}

export async function fetchMetaDailySpend(options: MetaOptions): Promise<AdSpendRow[]> {
  if (!options.adAccountId) throw new Error("META_AD_ACCOUNT_ID manquant");
  if (!options.accessToken) throw new Error("META_ACCESS_TOKEN manquant");
  const fetchImpl = options.fetchImpl ?? fetch;
  const version = options.graphVersion ?? "v26.0";
  const first = new URL(`https://graph.facebook.com/${version}/act_${options.adAccountId.replace(/^act_/, "")}/insights`);
  first.searchParams.set("level", "account");
  first.searchParams.set("time_increment", "1");
  first.searchParams.set("time_range", JSON.stringify({ since: options.since, until: options.until }));
  first.searchParams.set("fields", "spend,impressions,clicks,actions,action_values");
  first.searchParams.set("limit", "100");

  const rows: AdSpendRow[] = [];
  let next: string | undefined = first.toString();
  while (next) {
    const response = await fetchImpl(next, { headers: { Authorization: `Bearer ${options.accessToken}` } });
    const body = (await response.json()) as { data?: InsightRow[]; paging?: { next?: string }; error?: { message: string } };
    if (!response.ok || body.error) {
      throw new Error(`Meta Marketing API : ${body.error?.message ?? `HTTP ${response.status}`}`);
    }
    for (const r of body.data ?? []) {
      rows.push({
        day: r.date_start,
        platform: "meta",
        spend: Number(r.spend ?? 0),
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
        purchases: purchaseMetric(r.actions),
        purchaseValue: purchaseMetric(r.action_values),
      });
    }
    next = body.paging?.next;
  }
  return rows;
}
