import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TripsManager } from "@/components/TripsManager";
import { getSessionUser } from "@/lib/session";
import { listSavedSearches, listTrips, listWishlist } from "@/lib/services/me";
import { DESTINATIONS, getDestination } from "@/data/destinations";

export const metadata: Metadata = { title: "Mes voyages" };

export default async function VoyagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/compte/connexion?next=/voyages");
  const [trips, searches, wish] = await Promise.all([listTrips(user.id), listSavedSearches(user.id), listWishlist(user.id)]);
  return (
    <>
      <PageHeader title="Mes voyages" subtitle="Voyages prévus, recherches enregistrées et envies." mood="explorer" />
      <TripsManager
        trips={JSON.parse(JSON.stringify(trips))}
        searches={JSON.parse(JSON.stringify(searches))}
        wishlist={wish.map((w) => ({ slug: w.destinationSlug, name: getDestination(w.destinationSlug)?.name.fr ?? w.destinationSlug }))}
        cities={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name.fr }))}
      />
    </>
  );
}
