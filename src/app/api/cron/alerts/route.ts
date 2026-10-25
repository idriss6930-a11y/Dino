import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { runDueAlerts } from "@/lib/services/alerts";
import { purgeExpired } from "@/lib/services/auth";

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Point d'entrée pour un planificateur externe (cron d'hébergeur). Protégé par CRON_SECRET (≥ 16 caractères). */
export const POST = api(async (req) => {
  if (!authorized(req.headers.get("authorization"))) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const alerts = await runDueAlerts(100);
  await purgeExpired();
  return { checked: alerts.checked, notified: alerts.notified };
});
