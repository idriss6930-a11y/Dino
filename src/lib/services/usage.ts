import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { apiUsage, dataSources } from "@/lib/db/schema";

/** Compte les appels par source et par jour (surveillance des coûts d'API). Ne bloque jamais la requête. */
export async function recordApiUsage(sourceId: string, error: boolean) {
  try {
    const db = await getDb();
    const day = new Date().toISOString().slice(0, 10);
    await db
      .insert(apiUsage)
      .values({ sourceId, day, requests: 1, errors: error ? 1 : 0 })
      .onConflictDoUpdate({
        target: [apiUsage.sourceId, apiUsage.day],
        set: { requests: sql`${apiUsage.requests} + 1`, errors: sql`${apiUsage.errors} + ${error ? 1 : 0}` },
      });
    await db
      .update(dataSources)
      .set(error ? { lastErrorAt: new Date() } : { lastSuccessAt: new Date() })
      .where(sql`${dataSources.id} = ${sourceId}`);
  } catch {
    // La télémétrie ne doit jamais faire échouer une recherche.
  }
}
