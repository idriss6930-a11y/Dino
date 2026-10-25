import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { buildProfile, recommend } from "@/lib/services/recommendations";

export const GET = api(async (req) => {
  const user = await getSessionUser();
  const month = Number(req.nextUrl.searchParams.get("month") ?? 0) || undefined;
  return { recommendations: recommend(await buildProfile(user?.id ?? null), { month }) };
});
