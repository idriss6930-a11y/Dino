import { api } from "@/lib/api";
import { searchPlaces } from "@/lib/services/airports";

export const GET = api(async (req) => {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return { suggestions: q.trim().length < 2 ? [] : searchPlaces(q, 8) };
}, { rate: { name: "places", limit: 120, windowMs: 60_000 } });
