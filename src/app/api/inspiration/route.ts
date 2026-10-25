import { api, searchParamsToObject } from "@/lib/api";
import { inspire } from "@/lib/services/inspiration";

export const GET = api(async (req) => inspire(searchParamsToObject(req.nextUrl.searchParams, ["tags"])), {
  rate: { name: "inspiration", limit: 60, windowMs: 60_000 },
});
