import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { createAlert, listAlerts, PLAN_LIMITS } from "@/lib/services/alerts";

export const GET = api(async () => {
  const user = await requireUser();
  return { alerts: await listAlerts(user.id), limits: PLAN_LIMITS[user.plan], plan: user.plan };
});

export const POST = api(async (req) => {
  const user = await requireUser();
  return createAlert(user, await req.json());
}, { rate: { name: "alert-create", limit: 30, windowMs: 3_600_000 } });
