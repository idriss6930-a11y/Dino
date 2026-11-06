import { describe, expect, it } from "vitest";
import { fetchMetaDailySpend } from "../src/ads/meta";

function fakeFetch(pages: Array<{ status: number; body: unknown }>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const page = pages.shift()!;
    return new Response(JSON.stringify(page.body), { status: page.status });
  };
  return { calls, fetchImpl };
}

const row = (day: string, spend: string, purchases?: string, value?: string) => ({
  date_start: day,
  date_stop: day,
  spend,
  impressions: "1000",
  clicks: "15",
  ...(purchases ? { actions: [{ action_type: "link_click", value: "12" }, { action_type: "purchase", value: purchases }] } : {}),
  ...(value ? { action_values: [{ action_type: "purchase", value }] } : {}),
});

const options = { adAccountId: "123", accessToken: "EAAtest", since: "2026-11-01", until: "2026-11-02", graphVersion: "v24.0" };

describe("fetchMetaDailySpend", () => {
  it("requests daily account-level insights with the token in the Authorization header", async () => {
    const { calls, fetchImpl } = fakeFetch([{ status: 200, body: { data: [] } }]);
    await fetchMetaDailySpend({ ...options, fetchImpl });
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v24.0/act_123/insights");
    expect(url.searchParams.get("time_increment")).toBe("1");
    expect(url.searchParams.get("level")).toBe("account");
    expect(url.searchParams.get("access_token")).toBeNull();
    expect(new Headers(calls[0]!.init.headers).get("Authorization")).toBe("Bearer EAAtest");
  });

  it("parses spend, delivery and purchases per day", async () => {
    const { fetchImpl } = fakeFetch([{ status: 200, body: { data: [row("2026-11-01", "12.50", "1", "59"), row("2026-11-02", "8.00")] } }]);
    const rows = await fetchMetaDailySpend({ ...options, fetchImpl });
    expect(rows).toEqual([
      { day: "2026-11-01", platform: "meta", spend: 12.5, impressions: 1000, clicks: 15, purchases: 1, purchaseValue: 59 },
      { day: "2026-11-02", platform: "meta", spend: 8, impressions: 1000, clicks: 15, purchases: 0, purchaseValue: 0 },
    ]);
  });

  it("follows pagination links", async () => {
    const { calls, fetchImpl } = fakeFetch([
      { status: 200, body: { data: [row("2026-11-01", "1")], paging: { next: "https://graph.facebook.com/v24.0/act_123/insights?after=abc" } } },
      { status: 200, body: { data: [row("2026-11-02", "2")] } },
    ]);
    const rows = await fetchMetaDailySpend({ ...options, fetchImpl });
    expect(rows.map((r) => r.spend)).toEqual([1, 2]);
    expect(calls[1]!.url).toContain("after=abc");
  });

  it("surfaces the Graph API error message", async () => {
    const { fetchImpl } = fakeFetch([{ status: 400, body: { error: { message: "Invalid OAuth access token", code: 190 } } }]);
    await expect(fetchMetaDailySpend({ ...options, fetchImpl })).rejects.toThrow(/Invalid OAuth access token/);
  });
});
