import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { DESTINATIONS } from "@/data/destinations";

describe("base de données", () => {
  it("applique les migrations et charge le référentiel", async () => {
    const db = await getDb();
    const r = await db.execute(sql`select (select count(*)::int from destinations) as d, (select count(*)::int from airports) as a, (select count(*)::int from countries) as c`);
    const row = (r as unknown as { rows: { d: number; a: number; c: number }[] }).rows[0];
    expect(row.d).toBe(DESTINATIONS.length);
    expect(row.a).toBeGreaterThan(3000);
    expect(row.c).toBeGreaterThan(150);
  });
});
