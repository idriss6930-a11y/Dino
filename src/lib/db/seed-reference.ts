/** Chargement idempotent du référentiel (pays, villes, aéroports, destinations, sources). */
import { sql } from "drizzle-orm";
import geo from "@/data/geo/countries.geo.json";
import { COUNTRIES } from "@/data/countries";
import { DATA_VERSION, DESTINATIONS } from "@/data/destinations";
import { AIRPORTS } from "@/lib/services/airports";
import { SOURCE_CATALOG } from "@/lib/providers/registry";
import type { DB } from "./client";
import * as s from "./schema";

const CONTINENT_FR: Record<string, string> = {
  Europe: "Europe", Asia: "Asie", Africa: "Afrique", "North America": "Amérique du Nord", "South America": "Amérique du Sud",
  Oceania: "Océanie", Antarctica: "Antarctique", "Seven seas (open ocean)": "Océans",
};

export async function ensureReferenceData(db: DB) {
  const existing = await db.select({ v: s.destinations.dataVersion, n: sql<number>`count(*)::int` }).from(s.destinations).groupBy(s.destinations.dataVersion);
  if (existing.length === 1 && existing[0].v === DATA_VERSION && existing[0].n === DESTINATIONS.length) return;

  await db.insert(s.dataSources).values(SOURCE_CATALOG.map((x) => ({ ...x }))).onConflictDoNothing();

  const countryRows = new Map<string, typeof s.countries.$inferInsert>();
  for (const f of (geo as { features: { properties: { iso: string; name: string; name_fr: string | null; continent: string } }[] }).features) {
    const p = f.properties;
    countryRows.set(p.iso, { iso2: p.iso, nameFr: p.name_fr ?? p.name, nameEn: p.name, continent: CONTINENT_FR[p.continent] ?? p.continent, currency: null });
  }
  for (const [iso, c] of Object.entries(COUNTRIES)) {
    countryRows.set(iso, { iso2: iso, nameFr: c.fr, nameEn: c.en, continent: c.continent, currency: c.currency });
  }
  await db
    .insert(s.countries)
    .values([...countryRows.values()])
    .onConflictDoUpdate({ target: s.countries.iso2, set: { nameFr: sql`excluded.name_fr`, nameEn: sql`excluded.name_en`, continent: sql`excluded.continent`, currency: sql`excluded.currency` } });

  await db
    .insert(s.cities)
    .values(DESTINATIONS.map((d) => ({ slug: d.slug, countryIso: d.countryIso, nameFr: d.name.fr, nameEn: d.name.en, lat: d.lat, lon: d.lon, timeZone: d.timeZone })))
    .onConflictDoUpdate({ target: s.cities.slug, set: { nameFr: sql`excluded.name_fr`, nameEn: sql`excluded.name_en`, lat: sql`excluded.lat`, lon: sql`excluded.lon`, timeZone: sql`excluded.time_zone` } });

  await db
    .insert(s.destinations)
    .values(DESTINATIONS.map((d) => ({ slug: d.slug, citySlug: d.slug, countryIso: d.countryIso, tags: d.tags, dataVersion: DATA_VERSION })))
    .onConflictDoUpdate({ target: s.destinations.slug, set: { tags: sql`excluded.tags`, dataVersion: sql`excluded.data_version` } });

  for (let i = 0; i < AIRPORTS.length; i += 500) {
    await db
      .insert(s.airports)
      .values(AIRPORTS.slice(i, i + 500).map((a) => ({ iata: a.iata, name: a.name, cityName: a.city, countryIso: a.country, lat: a.lat, lon: a.lon, size: a.size })))
      .onConflictDoNothing();
  }
}
