import { Suspense } from "react";
import type { Metadata } from "next";
import { BudgetClient } from "@/components/BudgetClient";
import { PageHeader, Spinner } from "@/components/ui";
import { DESTINATIONS } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";

export const metadata: Metadata = { title: "Budget total du voyage" };

export default function BudgetPage() {
  const cities = DESTINATIONS.map((d) => ({ slug: d.slug, name: `${d.name.fr} · ${COUNTRIES[d.countryIso]?.fr ?? d.countryIso}` })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return (
    <>
      <PageHeader title="Budget total du voyage" subtitle="Vol, bagages, logement, repas, transport, activités, assurance et frais bancaires : trois scénarios, chaque ligne marquée confirmée ou estimée." mood="surprised" />
      <Suspense fallback={<Spinner />}>
        <BudgetClient cities={cities} />
      </Suspense>
    </>
  );
}
