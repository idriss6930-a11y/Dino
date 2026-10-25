/**
 * Tendances : uniquement des agrégats calculés à partir des données réelles de DINO, jamais de statistiques inventées.
 * Protection de la vie privée : une destination n'apparaît que si au moins MIN_USERS personnes distinctes l'ont
 * recherchée ou ajoutée à leurs envies (k-anonymat), et seulement à partir de recherches dont l'historique est autorisé.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { DESTINATIONS } from "@/data/destinations";
import { countObservations } from "./price-history";

export const MIN_USERS = 5;

export async function communityTrends() {
  const db = await getDb();
  const wish = await db.execute<{ slug: string; users: number }>(
    sql`select destination_slug as slug, count(distinct user_id)::int as users from wishlist_items where created_at > now() - interval '90 days' group by 1 having count(distinct user_id) >= ${MIN_USERS} order by 2 desc limit 10`,
  );
  const airportToSlug = new Map(DESTINATIONS.flatMap((d) => d.airports.map((a) => [a, d.slug] as const)));
  const searches = await db.execute<{ dest: string; users: number }>(
    sql`select upper(params->>'destination') as dest, count(distinct user_id)::int as users from search_history where kind = 'flight' and created_at > now() - interval '30 days' and params->>'destination' is not null group by 1 having count(distinct user_id) >= ${MIN_USERS} order by 2 desc limit 20`,
  );
  const totals = await db.execute<{ users: number; tips: number }>(
    sql`select (select count(*)::int from users) as users, (select count(*)::int from tips where status = 'published' and is_demo = false) as tips`,
  );
  const rows = <T,>(r: unknown) => ((r as { rows?: T[] }).rows ?? (r as T[]));
  const name = (slug: string) => DESTINATIONS.find((d) => d.slug === slug)?.name.fr ?? slug;
  return {
    wishlisted: rows<{ slug: string; users: number }>(wish).map((r) => ({ slug: r.slug, name: name(r.slug), users: r.users })),
    searched: rows<{ dest: string; users: number }>(searches)
      .map((r) => ({ code: r.dest, slug: airportToSlug.get(r.dest), users: r.users }))
      .map((r) => ({ ...r, name: r.slug ? name(r.slug) : r.code })),
    totals: rows<{ users: number; tips: number }>(totals)[0] ?? { users: 0, tips: 0 },
    observations: await countObservations(),
    minUsers: MIN_USERS,
  };
}
