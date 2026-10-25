import { Suspense } from "react";
import type { Metadata } from "next";
import { HotelsClient } from "@/components/hotels/HotelsClient";
import { PageHeader, Spinner } from "@/components/ui";
import { DESTINATIONS } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Comparateur d'hôtels" };

export default async function HotelsPage() {
  const user = await getSessionUser();
  const cities = DESTINATIONS.map((d) => ({ slug: d.slug, name: `${d.name.fr} · ${COUNTRIES[d.countryIso]?.fr ?? d.countryIso}` })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return (
    <>
      <PageHeader title="Comparateur d'hôtels" subtitle="Prix par nuit et total, taxes séparées, offres équivalentes uniquement, même établissement rapproché entre fournisseurs." mood="sleeping" />
      <Suspense fallback={<Spinner />}>
        <HotelsClient cities={cities} loggedIn={!!user} />
      </Suspense>
    </>
  );
}
