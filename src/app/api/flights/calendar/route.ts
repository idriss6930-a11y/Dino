import { api } from "@/lib/api";
import { flightCalendar } from "@/lib/services/flight-search";

export const GET = api(async (req) => {
  const sp = req.nextUrl.searchParams;
  return flightCalendar(sp.get("origin") ?? "", sp.get("destination") ?? "", sp.get("month") ?? "", sp.get("currency") ?? "EUR");
}, { rate: { name: "calendar", limit: 30, windowMs: 60_000 } });
