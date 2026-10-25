import type { Metadata } from "next";
import { DESTINATIONS } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";
import { TAGS } from "@/data/types";
import { PageHeader } from "@/components/ui";
import { WorldExplorer } from "@/components/map/WorldExplorer";
import { scoreMonths } from "@/lib/services/seasons";

export const metadata: Metadata = { title: "Carte du monde" };

export default function CartePage() {
  const destinations = DESTINATIONS.map((d) => ({
    slug: d.slug,
    name: d.name.fr,
    country: COUNTRIES[d.countryIso]?.fr ?? d.countryIso,
    lat: d.lat,
    lon: d.lon,
    tags: d.tags,
    summary: d.summary,
    months: scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] }))).map((s) => ({
      weather: s.weather,
      price: s.price,
      crowd: s.crowd,
      overall: s.overall,
      tmax: s.climate.tmax,
      precip: s.climate.precip,
    })),
  }));
  return (
    <>
      <PageHeader title="Carte du monde" subtitle="Où fait-il beau, où est-ce moins cher, où y a-t-il moins de monde, mois par mois." mood="explorer" />
      <WorldExplorer destinations={destinations} tags={TAGS} />
    </>
  );
}
