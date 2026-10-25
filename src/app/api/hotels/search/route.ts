import { api, searchParamsToObject } from "@/lib/api";
import { searchHotels } from "@/lib/services/hotel-search";
import { getSessionUser } from "@/lib/session";
import { recordSearch } from "@/lib/services/me";

export const GET = api(async (req) => {
  const result = await searchHotels(searchParamsToObject(req.nextUrl.searchParams, ["types", "amenities"]));
  const user = await getSessionUser();
  if (user) await recordSearch(user.id, "hotel", Object.fromEntries([...req.nextUrl.searchParams.entries()].slice(0, 20)));
  return result;
}, { rate: { name: "hotels", limit: 30, windowMs: 60_000 } });
