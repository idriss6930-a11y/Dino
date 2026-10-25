/**
 * Remplace les normales éditoriales par des moyennes ERA5 (Open-Meteo) destination par destination.
 * Déclenchement explicite seulement (script ou administrateur) : chaque destination = 1 appel d'archive.
 * Rappel : l'usage commercial d'Open-Meteo demande un abonnement (docs/PROVIDERS.md).
 */
import { and, eq, sql } from "drizzle-orm";
import { DESTINATIONS } from "@/data/destinations";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { fetchClimateNormals } from "@/lib/providers/climate";
import { log } from "@/lib/log";
import { recordApiUsage } from "./usage";

export async function refreshClimate(opts: { limit?: number; force?: boolean } = {}) {
  const db = await getDb();
  const done = await db
    .select({ slug: s.climateNormals.destinationSlug, n: sql<number>`count(*)::int` })
    .from(s.climateNormals)
    .where(eq(s.climateNormals.sourceId, "open-meteo"))
    .groupBy(s.climateNormals.destinationSlug);
  const complete = new Set(done.filter((d) => d.n === 12).map((d) => d.slug));
  const todo = DESTINATIONS.filter((d) => opts.force || !complete.has(d.slug)).slice(0, opts.limit ?? 10);
  const out = { updated: [] as string[], failed: [] as string[] };
  for (const d of todo) {
    try {
      const { months, period } = await fetchClimateNormals(d.lat, d.lon);
      const fetchedAt = new Date();
      await db.delete(s.climateNormals).where(and(eq(s.climateNormals.destinationSlug, d.slug), eq(s.climateNormals.sourceId, "open-meteo")));
      await db.insert(s.climateNormals).values(months.map((m) => ({ destinationSlug: d.slug, month: m.month, tmaxC: m.tmaxC, tminC: m.tminC, precipMm: m.precipMm, sourceId: "open-meteo", period, fetchedAt })));
      await recordApiUsage("open-meteo", false);
      out.updated.push(d.slug);
    } catch (e) {
      await recordApiUsage("open-meteo", true);
      log.warn("climate_refresh_failed", { slug: d.slug, error: e instanceof Error ? e.message : String(e) });
      out.failed.push(d.slug);
    }
  }
  return { ...out, remaining: DESTINATIONS.length - complete.size - out.updated.length };
}
