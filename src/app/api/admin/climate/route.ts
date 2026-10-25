import { api } from "@/lib/api";
import { requireModerator } from "@/lib/session";
import { ForbiddenError } from "@/lib/services/errors";
import { refreshClimate } from "@/lib/services/climate-refresh";

/** Réservé aux administrateurs : remplace des normales éditoriales par des moyennes ERA5 (10 destinations par appel). */
export const POST = api(async () => {
  const user = await requireModerator();
  if (user.role !== "admin") throw new ForbiddenError();
  return refreshClimate({ limit: 10 });
});
