import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AccountSettings } from "@/components/AccountSettings";
import { Notice, PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { getMe } from "@/lib/services/me";
import { airportLabel } from "@/lib/services/airports";
import { TAGS } from "@/data/types";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function ComptePage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/compte/connexion?next=/compte");
  const me = await getMe(user.id);
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Mon compte" subtitle="Préférences, confidentialité, notifications et données personnelles." mood="happy" />
      {sp.bienvenue && (
        <div className="mb-4">
          <Notice>Bienvenue sur DINO ! Indiquez votre aéroport habituel et vos styles de voyage pour des suggestions plus pertinentes (facultatif).</Notice>
        </div>
      )}
      <AccountSettings
        user={JSON.parse(JSON.stringify(me.user))}
        prefs={JSON.parse(JSON.stringify(me.prefs))}
        privacy={JSON.parse(JSON.stringify(me.privacy))}
        tags={TAGS}
        homeLabel={me.prefs?.homeAirport ? airportLabel(me.prefs.homeAirport) : ""}
      />
    </>
  );
}
