import { api, searchParamsToObject } from "@/lib/api";
import { flightPriceInsight } from "@/lib/services/insight";

export const GET = api(async (req) => flightPriceInsight(searchParamsToObject(req.nextUrl.searchParams, ["carriers"])), {
  rate: { name: "insight", limit: 30, windowMs: 60_000 },
});
