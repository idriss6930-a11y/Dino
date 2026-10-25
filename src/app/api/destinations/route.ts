import { api } from "@/lib/api";
import { DESTINATIONS } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";

/** Liste publique des destinations (application mobile). Données éditoriales, sans prix. */
export const GET = api(async () => ({
  destinations: DESTINATIONS.map((d) => ({
    slug: d.slug,
    name: d.name.fr,
    country: COUNTRIES[d.countryIso]?.fr ?? d.countryIso,
    summary: d.summary,
    tags: d.tags,
    hiddenGem: d.hiddenGem,
    airports: d.airports,
  })),
}));
