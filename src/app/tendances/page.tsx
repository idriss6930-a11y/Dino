import Link from "next/link";
import type { Metadata } from "next";
import { DESTINATIONS, MONTHS_FR } from "@/data/destinations";
import { DataBadge, Notice, PageHeader, ScoreBar } from "@/components/ui";
import { communityTrends } from "@/lib/services/trends";
import { scoreMonths } from "@/lib/services/seasons";

export const metadata: Metadata = { title: "Tendances" };

export default async function TendancesPage() {
  const t = await communityTrends();
  const month = new Date().getUTCMonth() + 1;
  const next = (month % 12) + 1;
  const rising = DESTINATIONS.map((d) => {
    const s = scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })));
    return { d, now: s[month - 1], next: s[next - 1] };
  })
    .filter((x) => x.next.overall - x.now.overall >= 8)
    .sort((a, b) => b.next.overall - b.now.overall - (a.next.overall - a.now.overall))
    .slice(0, 6);
  return (
    <div className="space-y-8">
      <PageHeader title="Tendances" subtitle="Ce que montrent réellement les données de DINO, sans statistique inventée." mood="thinking" />
      <Notice>
        Les classements de la communauté n&apos;affichent une destination que si au moins {t.minUsers} voyageurs distincts l&apos;ont recherchée ou ajoutée à leurs envies (protection de la vie privée). DINO compte aujourd&apos;hui {t.totals.users} compte(s),{" "}
        {t.totals.tips} conseil(s) publiés par la communauté, {t.observations.real} prix réels et {t.observations.demo} prix de démonstration observés.
      </Notice>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Les plus recherchées (30 jours)</h2>
          {t.searched.length ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {t.searched.map((r) => (
                <li key={r.code}>
                  {r.slug ? <Link href={`/destinations/${r.slug}`} className="underline">{r.name}</Link> : r.name} <span className="text-xs text-muted">({r.users} voyageurs)</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Pas encore assez de recherches pour publier un classement fiable et anonyme.</p>
          )}
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Les plus désirées (90 jours)</h2>
          {t.wishlisted.length ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {t.wishlisted.map((r) => (
                <li key={r.slug}>
                  <Link href={`/destinations/${r.slug}`} className="underline">
                    {r.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">({r.users} voyageurs)</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Pas encore assez de listes d&apos;envies pour publier un classement fiable et anonyme.</p>
          )}
        </div>
      </section>
      <section>
        <h2 className="section-title mb-1">Qui monte le mois prochain ?</h2>
        <p className="mb-3 text-sm text-muted">
          Destinations dont l&apos;intérêt saisonnier progresse nettement entre {MONTHS_FR[month - 1]} et {MONTHS_FR[next - 1]}. <DataBadge kind="editorial" />
        </p>
        {rising.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rising.map(({ d, now, next: n }) => (
              <Link key={d.slug} href={`/destinations/${d.slug}`} className="card space-y-2 p-4 hover:border-sage-300">
                <p className="font-display font-bold">
                  {d.name.fr}{" "}
                  <span className="text-sm text-deep-700">
                    {now.overall} → {n.overall}
                  </span>
                </p>
                <ScoreBar label="Météo" value={n.weather} />
                <ScoreBar label="Prix" value={n.price} tone="orange" />
                <ScoreBar label="Calme" value={n.crowd} tone="sky" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Aucun changement saisonnier marqué ce mois-ci.</p>
        )}
      </section>
    </div>
  );
}
