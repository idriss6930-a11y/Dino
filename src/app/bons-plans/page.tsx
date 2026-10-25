import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import { DataBadge, EmptyState, Notice, PageHeader } from "@/components/ui";
import { findDeals } from "@/lib/services/deals";
import { airportLabel, resolveAirports } from "@/lib/services/airports";
import { getSessionUser } from "@/lib/session";
import { getMe } from "@/lib/services/me";
import { formatMoney } from "@/lib/utils/money";
import { formatDateFr } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Bons plans" };
const ORIGINS = ["PAR", "LYS", "MRS", "NCE", "BOD", "TLS", "NTE", "BRU", "GVA", "YUL"];

export default async function BonsPlansPage({ searchParams }: { searchParams: Promise<{ depuis?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const pref = user ? (await getMe(user.id)).prefs?.homeAirport : null;
  const origin = sp.depuis && resolveAirports(sp.depuis).length ? sp.depuis.toUpperCase() : (pref ?? "PAR");
  const r = await findDeals({ origin, limit: 24, maxDestinations: 49 });
  return (
    <>
      <PageHeader title="Bons plans" subtitle={`Prix d'aller simple nettement sous l'habitude, au départ de ${airportLabel(origin)}.`} mood="surprised" />
      <div className="mb-4 flex flex-wrap gap-2">
        {[...new Set([...(pref ? [pref] : []), ...ORIGINS])].map((o) => (
          <Link key={o} href={`/bons-plans?depuis=${o}`} className={clsx("chip", o === origin ? "border-deep-800 bg-deep-800 text-white" : "border-sage-200 bg-white")}>
            {airportLabel(o)}
          </Link>
        ))}
      </div>
      <Notice>{r.method} Un bon plan est un prix observé à un instant donné : il peut disparaître, vérifiez-le par une recherche.</Notice>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {r.deals.map((d) => (
          <Link key={d.slug} href={`/vols?${new URLSearchParams({ trip: "oneway", origin: d.origin, destination: d.destination, departDate: d.date })}`} className="card p-4 hover:border-sage-300">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-lg font-bold">
                {d.name} <span className="text-xs font-normal text-muted">{d.country}</span>
              </span>
              <DataBadge kind={d.isDemo ? "demo" : "cached"} />
            </div>
            <p className="text-2xl font-black text-orange-500">{formatMoney(d.priceCents, d.currency)}</p>
            <p className="text-xs text-muted">
              {d.origin} → {d.destination}, aller simple le {formatDateFr(d.date)} · −{d.savingPct} % vs estimation ({formatMoney(d.typicalCents, d.currency)})
            </p>
            <p className="mt-1 text-xs text-muted">
              Source : {d.sourceName}
              {d.foundAt ? ` · vu le ${new Date(d.foundAt).toLocaleDateString("fr-FR")}` : ""}
            </p>
          </Link>
        ))}
      </div>
      {r.deals.length === 0 && (
        <div className="mt-4">
          <EmptyState mood="sleeping" title="Pas de bon plan marquant pour l'instant">
            {r.calendarAvailable ? "Aucun prix n'est nettement sous l'habitude depuis cet aéroport." : "Aucune source de calendrier de prix n'est configurée (clé Travelpayouts nécessaire)."} Créez une alerte « bons plans » pour être prévenu.
          </EmptyState>
        </div>
      )}
    </>
  );
}
