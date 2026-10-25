import { Suspense } from "react";
import type { Metadata } from "next";
import { FlightsClient } from "@/components/flights/FlightsClient";
import { SearchPanel } from "@/components/SearchPanel";
import { PageHeader, Spinner } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { getMe } from "@/lib/services/me";
import { airportLabel } from "@/lib/services/airports";

export const metadata: Metadata = { title: "Comparateur de vols" };

export default async function VolsPage() {
  const user = await getSessionUser();
  const home = user ? ((await getMe(user.id)).prefs?.homeAirport ?? "PAR") : "PAR";
  return (
    <>
      <PageHeader title="Comparateur de vols" subtitle="Prix du billet, frais connus et coût total estimé, affichés séparément. Horaires en heure locale." mood="explorer" />
      <Suspense fallback={<Spinner />}>
        <FlightsClient loggedIn={!!user} searchForm={<SearchPanel only="flights" cities={[]} defaultOrigin={{ code: home, label: airportLabel(home) }} />} />
      </Suspense>
    </>
  );
}
