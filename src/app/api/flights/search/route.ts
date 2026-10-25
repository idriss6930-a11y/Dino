import { api, searchParamsToObject } from "@/lib/api";
import { searchFlights } from "@/lib/services/flight-search";
import { UserFacingError } from "@/lib/services/errors";
import { getSessionUser } from "@/lib/session";
import { recordSearch } from "@/lib/services/me";

export const GET = api(async (req) => {
  const raw = searchParamsToObject(req.nextUrl.searchParams, ["carriers"]);
  if (typeof raw.legs === "string") {
    try {
      raw.legs = JSON.parse(raw.legs);
    } catch {
      throw new UserFacingError("Trajets multi-destinations illisibles");
    }
  }
  const result = await searchFlights(raw);
  const user = await getSessionUser();
  if (user) await recordSearch(user.id, "flight", Object.fromEntries([...req.nextUrl.searchParams.entries()].slice(0, 20)));
  return result;
}, { rate: { name: "flights", limit: 30, windowMs: 60_000 } });
