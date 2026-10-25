import Link from "next/link";
import { ArrowRight, Bell, CalendarHeart, Compass, Sparkles } from "lucide-react";
import { Dino } from "@/components/Dino";
import { SearchPanel } from "@/components/SearchPanel";
import { DataBadge, ScoreBar } from "@/components/ui";
import { DismissButton } from "@/components/ActionButtons";
import { DESTINATIONS, MONTHS_FR } from "@/data/destinations";
import { getSessionUser } from "@/lib/session";
import { getMe, listTrips } from "@/lib/services/me";
import { listAlerts } from "@/lib/services/alerts";
import { inspire } from "@/lib/services/inspiration";
import { findDeals } from "@/lib/services/deals";
import { buildProfile, recommend } from "@/lib/services/recommendations";
import { scoreMonths } from "@/lib/services/seasons";
import { airportLabel } from "@/lib/services/airports";
import { COUNTRIES } from "@/data/countries";
import { formatMoney } from "@/lib/utils/money";
import { formatDateFr, todayIn } from "@/lib/utils/dates";

export default async function Home() {
  const user = await getSessionUser();
  const me = user ? await getMe(user.id) : null;
  const home = me?.prefs?.homeAirport ?? "PAR";
  const defaultOrigin = { code: home, label: airportLabel(home) };
  const today = todayIn();
  const nextMonth = (Number(today.slice(5, 7)) % 12) + 1;

  const [deals, inspiration, recs, alerts, trips] = await Promise.all([
    findDeals({ origin: home, limit: 4, maxDestinations: 20 }),
    inspire({ origin: home, budget: 1200, nights: 5, month: nextMonth, limit: 30 }),
    buildProfile(user?.id ?? null).then((p) => recommend(p, { limit: 4, month: nextMonth })),
    user ? listAlerts(user.id) : Promise.resolve([]),
    user ? listTrips(user.id) : Promise.resolve([]),
  ]);

  const bestNow = DESTINATIONS.map((d) => {
    const s = scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })))[nextMonth - 1];
    return { d, s };
  })
    .sort((a, b) => b.s.overall - a.s.overall)
    .slice(0, 6);

  // Tranches exclusives : chaque destination n'apparaît que dans la tranche de son budget estimé.
  const TIERS = [400, 700, 1200];
  const tiers = TIERS.map((max, i) =>
    inspiration.results.filter((r) => r.fits && r.estimate.perPersonCents <= max * 100 && r.estimate.perPersonCents > (TIERS[i - 1] ?? 0) * 100).slice(0, 3),
  );

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <p className="chip border-sage-300 bg-sage-50 text-deep-700">
            <Sparkles size={14} /> Comparer, comprendre, partir au bon moment
          </p>
          <h1 className="text-3xl font-black leading-tight text-deep-900 sm:text-5xl">
            Le bon voyage, au bon prix, <span className="text-orange-500">au bon moment.</span>
          </h1>
          <p className="max-w-2xl text-muted">
            DINO compare plusieurs sources de vols et d&apos;hôtels, affiche le coût total réel, vous dit s&apos;il vaut mieux acheter ou attendre, et vous prévient quand un prix baisse. Chaque chiffre indique d&apos;où il vient.
          </p>
        </div>
        <Dino mood="explorer" size={150} className="mx-auto hidden sm:block" />
      </section>

      <SearchPanel cities={DESTINATIONS.map((d) => ({ slug: d.slug, name: `${d.name.fr} · ${COUNTRIES[d.countryIso]?.fr ?? d.countryIso}` }))} defaultOrigin={defaultOrigin} />

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/inspiration" className="card group flex items-center gap-4 p-5 hover:border-sage-300">
          <Dino mood="thinking" size={64} />
          <div>
            <p className="font-display text-lg font-bold text-deep-900">Je ne sais pas où partir</p>
            <p className="text-sm text-muted">Un budget, quelques envies : DINO propose et explique.</p>
          </div>
          <ArrowRight className="ml-auto text-sage-500 transition group-hover:translate-x-1" />
        </Link>
        <Link href="/assistant" className="card group flex items-center gap-4 p-5 hover:border-sage-300">
          <Dino mood="happy" size={64} />
          <div>
            <p className="font-display text-lg font-bold text-deep-900">Demander à DINO</p>
            <p className="text-sm text-muted">« 5 jours en avril au soleil avec 600 € depuis Lyon »</p>
          </div>
          <ArrowRight className="ml-auto text-sage-500 transition group-hover:translate-x-1" />
        </Link>
        <Link href="/budget" className="card group flex items-center gap-4 p-5 hover:border-sage-300">
          <Dino mood="surprised" size={64} />
          <div>
            <p className="font-display text-lg font-bold text-deep-900">Budget total du voyage</p>
            <p className="text-sm text-muted">Vol, logement, repas, transport, activités : 3 scénarios.</p>
          </div>
          <ArrowRight className="ml-auto text-sage-500 transition group-hover:translate-x-1" />
        </Link>
      </section>

      {user && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bell size={18} className="text-orange-500" />
              <h2 className="font-display text-lg font-bold">Mes alertes</h2>
              <Link href="/alertes" className="btn-link ml-auto text-sm">
                Gérer
              </Link>
            </div>
            {alerts.length ? (
              <ul className="space-y-2 text-sm">
                {alerts.slice(0, 4).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-sage-50 px-3 py-2">
                    <span className="truncate">{a.name}</span>
                    <span className="shrink-0 text-xs text-muted">{a.lastPriceCents ? formatMoney(a.lastPriceCents, a.currency) : a.active ? "en attente" : "en pause"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aucune alerte. Lancez une recherche puis « Créer une alerte » pour être prévenu d&apos;une baisse.</p>
            )}
          </div>
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarHeart size={18} className="text-orange-500" />
              <h2 className="font-display text-lg font-bold">Mes voyages enregistrés</h2>
              <Link href="/voyages" className="btn-link ml-auto text-sm">
                Tout voir
              </Link>
            </div>
            {trips.length ? (
              <ul className="space-y-2 text-sm">
                {trips.slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-xl bg-sage-50 px-3 py-2">
                    <span>{t.title}</span>
                    <span className="text-xs text-muted">{t.startDate ? formatDateFr(t.startDate) : "dates à définir"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aucun voyage enregistré pour l&apos;instant.</p>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <h2 className="section-title">Bons plans au départ de {airportLabel(home)}</h2>
            <p className="text-sm text-muted">Prix d&apos;aller simple observés nettement sous l&apos;estimation habituelle de la route.</p>
          </div>
          <Link href="/bons-plans" className="btn-link ml-auto text-sm">
            Tous les bons plans
          </Link>
        </div>
        {deals.deals.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.deals.map((d) => (
              <Link key={d.slug} href={`/vols?${new URLSearchParams({ trip: "oneway", origin: d.origin, destination: d.destination, departDate: d.date })}`} className="card p-4 hover:border-sage-300">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display font-bold text-deep-900">{d.name}</span>
                  <DataBadge kind={d.isDemo ? "demo" : "cached"} />
                </div>
                <p className="text-2xl font-black text-orange-500">{formatMoney(d.priceCents, d.currency)}</p>
                <p className="text-xs text-muted">
                  aller simple le {formatDateFr(d.date)} · {d.savingPct} % sous l&apos;estimation ({formatMoney(d.typicalCents, d.currency)})
                </p>
                <p className="mt-2 text-xs text-muted">Source : {d.sourceName}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="card p-4 text-sm text-muted">
            {deals.calendarAvailable ? "Aucun prix nettement inférieur à l'habitude pour le moment." : "Aucune source de calendrier de prix n'est configurée : les bons plans apparaîtront avec une clé Travelpayouts."}
          </p>
        )}
      </section>

      <section>
        <h2 className="section-title mb-1">Destinations selon votre budget</h2>
        <p className="mb-4 text-sm text-muted">
          5 nuits en {MONTHS_FR[nextMonth - 1]}, par personne, vol compris. <DataBadge kind="estimation" />
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <div key={i} className="card p-4">
              <p className="mb-3 font-display text-lg font-bold text-deep-900">{i === 0 ? "Moins de 400 €" : `De ${TIERS[i - 1]} à ${TIERS[i]} €`}</p>
              {t.length === 0 ? (
                <p className="text-sm text-muted">Aucune destination dans cette tranche depuis {airportLabel(home)} ce mois-ci, selon nos estimations.</p>
              ) : (
                <ul className="space-y-2">
                  {t.map((r) => (
                    <li key={r.destination.slug}>
                      <Link href={`/destinations/${r.destination.slug}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-sage-50">
                        <span>
                          <span className="font-medium">{r.destination.name.fr}</span> <span className="text-xs text-muted">{r.countryName}</span>
                        </span>
                        <span className="text-sm font-semibold text-deep-800">≈ {formatMoney(r.estimate.perPersonCents, r.estimate.currency)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-1">Où partir au meilleur moment ?</h2>
        <p className="mb-4 text-sm text-muted">
          Les destinations les mieux placées en {MONTHS_FR[nextMonth - 1]} : météo, niveau de prix et affluence sont évalués séparément. <DataBadge kind="editorial" />
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bestNow.map(({ d, s }) => (
            <Link key={d.slug} href={`/destinations/${d.slug}`} className="card space-y-2 p-4 hover:border-sage-300">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-deep-900">{d.name.fr}</span>
                <span className="text-xs text-muted">
                  {s.climate.tmax} °C · {s.climate.precip} mm
                </span>
              </div>
              <ScoreBar label="Météo" value={s.weather} />
              <ScoreBar label="Prix" value={s.price} tone="orange" />
              <ScoreBar label="Calme" value={s.crowd} tone="sky" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Compass className="text-orange-500" />
          <h2 className="section-title">{user && recs.some((r) => !r.reasons[0]?.startsWith("Sélection")) ? "Pour vous" : "Suggestions de saison"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recs.map((r) => (
            <div key={r.slug} className="card flex flex-col p-4">
              <Link href={`/destinations/${r.slug}`} className="font-display text-lg font-bold text-deep-900 hover:underline">
                {r.name}
              </Link>
              <p className="text-xs text-muted">
                {r.countryName} · {r.monthName}
                {r.discovery && " · Découverte"}
              </p>
              <ul className="mt-2 flex-1 list-disc space-y-1 pl-4 text-xs text-deep-800">
                {r.reasons.slice(0, 3).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {user && (
                <div className="mt-3">
                  <DismissButton slug={r.slug} />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Pourquoi ces suggestions ? Chaque carte indique ses raisons. La personnalisation se désactive dans <Link className="underline" href="/compte">Mon compte</Link>.
        </p>
      </section>
    </div>
  );
}
