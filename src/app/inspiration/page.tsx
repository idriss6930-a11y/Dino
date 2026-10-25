import { Suspense } from "react";
import type { Metadata } from "next";
import { InspirationClient } from "@/components/InspirationClient";
import { PageHeader, Spinner } from "@/components/ui";
import { TAGS } from "@/data/types";
import { getSessionUser } from "@/lib/session";
import { getMe } from "@/lib/services/me";
import { airportLabel } from "@/lib/services/airports";

export const metadata: Metadata = { title: "Je ne sais pas où partir" };

export default async function InspirationPage() {
  const user = await getSessionUser();
  const home = user ? ((await getMe(user.id)).prefs?.homeAirport ?? "PAR") : "PAR";
  return (
    <>
      <PageHeader title="Je ne sais pas où partir" subtitle="Un budget, un mois, quelques envies : DINO propose des destinations et explique pourquoi." mood="thinking" />
      <Suspense fallback={<Spinner />}>
        <InspirationClient tags={TAGS} defaultOrigin={{ code: home, label: airportLabel(home) }} />
      </Suspense>
    </>
  );
}
