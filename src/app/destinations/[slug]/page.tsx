import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import clsx from "clsx";
import { AlertTriangle, CalendarDays, Gem, Plane, Wallet } from "lucide-react";
import { getDestination, MONTHS_SHORT_FR } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";
import { TAGS } from "@/data/types";
import { Dino } from "@/components/Dino";
import { DataBadge, Notice } from "@/components/ui";
import { WishlistButton } from "@/components/ActionButtons";
import { TipCard, type TipView } from "@/components/community/TipCard";
import { bestMonths, getClimate, scoreMonths } from "@/lib/services/seasons";
import { getSessionUser } from "@/lib/session";
import { getMe, listWishlist, recordInteraction } from "@/lib/services/me";
import { CATEGORY_LABELS, listTips } from "@/lib/services/community";
import { airportLabel } from "@/lib/services/airports";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getDestination((await params).slug);
  return { title: d ? `${d.name.fr} : quand partir, budget, conseils` : "Destination" };
}

const cell = (v: number) => (v >= 75 ? "bg-sage-400 text-white" : v >= 50 ? "bg-sage-200 text-deep-900" : v >= 30 ? "bg-orange-400/30 text-deep-900" : "bg-orange-500/70 text-white");

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = getDestination((await params).slug);
  if (!d) notFound();
  const user = await getSessionUser();
  if (user) await recordInteraction(user.id, d.slug, "view");
  const home = user ? ((await getMe(user.id)).prefs?.homeAirport ?? "PAR") : "PAR";
  const [{ months, source }, tips, wish] = await Promise.all([getClimate(d), listTips({ destination: d.slug, limit: 6 }, user), user ? listWishlist(user.id) : Promise.resolve([])]);
  const scores = scoreMonths(d, months);
  const best = bestMonths(scores);
  const country = COUNTRIES[d.countryIso];
  const now = new Date().getUTCMonth() + 1;
  const nextMonth = `${new Date().getUTCFullYear() + (now === 12 ? 1 : 0)}-${String((now % 12) + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start gap-4">
        <Dino mood="explorer" size={80} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {country?.fr} · {country?.continent}
          </p>
          <h1 className="text-3xl font-black text-deep-900 sm:text-4xl">{d.name.fr}</h1>
          <p className="mt-1 max-w-3xl text-deep-800">{d.summary}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {d.tags.map((t) => (
              <Link key={t} href={`/destinations?tag=${t}`} className="chip border-sage-200 bg-white text-deep-700">
                {TAGS[t]}
              </Link>
            ))}
            {d.hiddenGem && <span className="chip border-orange-400 bg-orange-400/10 text-orange-600">Méconnue</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WishlistButton slug={d.slug} initial={wish.some((w) => w.destinationSlug === d.slug)} loggedIn={!!user} />
          <Link href={`/vols?${new URLSearchParams({ origin: home, destination: d.airports[0], flexMonth: nextMonth, trip: "roundtrip" })}`} className="btn-primary">
            <Plane size={16} /> Prix des vols
          </Link>
          <Link href={`/budget?destination=${d.slug}`} className="btn-ghost">
            <Wallet size={16} /> Budget
          </Link>
        </div>
      </header>

      <section className="card p-4" aria-labelledby="cal">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CalendarDays className="text-orange-500" />
          <h2 id="cal" className="font-display text-xl font-bold text-deep-900">
            Calendrier sur 12 mois
          </h2>
          <span className="text-xs text-muted">Météo, prix et affluence sont trois notions distinctes, chacune notée sur 100.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr>
                <th className="w-28 text-left font-medium text-muted" />
                {MONTHS_SHORT_FR.map((m, i) => (
                  <th key={m} className={clsx("font-semibold", i + 1 === now ? "text-orange-600" : "text-deep-800")}>
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="text-left font-medium text-muted">T° max / min</th>
                {scores.map((s) => (
                  <td key={s.month} className="rounded bg-cream-100 py-1 tabular-nums">
                    {s.climate.tmax}° <span className="text-muted">{s.climate.tmin}°</span>
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-left font-medium text-muted">Pluie (mm)</th>
                {scores.map((s) => (
                  <td key={s.month} className="rounded bg-cream-100 py-1 tabular-nums">
                    {s.climate.precip}
                  </td>
                ))}
              </tr>
              {(
                [
                  ["Météo", "weather"],
                  ["Prix (100 = bas)", "price"],
                  ["Calme (100 = peu de monde)", "crowd"],
                  ["Global", "overall"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <th className="text-left font-medium text-muted">{label}</th>
                  {scores.map((s) => (
                    <td key={s.month} className={clsx("rounded py-1.5 font-semibold tabular-nums", cell(s[key]))}>
                      {s[key]}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th className="text-left font-medium text-muted">À savoir</th>
                {scores.map((s) => (
                  <td key={s.month} className="align-top text-[10px] leading-tight text-muted">
                    {[...s.flags, ...s.events].slice(0, 2).join(" · ")}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <DataBadge kind={source.kind === "era5" ? "fait" : "editorial"} />
          Climat : {source.label}. Prix et affluence : estimations relatives éditoriales DINO (pas des comptages ni des tarifs).
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BestCard title="Meilleure météo" months={best.weather.map((m) => m.name)} />
        <BestCard title="Prix les plus doux" months={best.price.map((m) => m.name)} />
        <BestCard title="Le moins de monde" months={best.crowd.map((m) => m.name)} />
        <div className="card bg-deep-800 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-sage-200">Moins cher et plus calme</p>
          <p className="font-display text-2xl font-bold capitalize">{best.cheapAndQuiet.name}</p>
          <p className="mt-1 text-xs text-sage-100">{best.cheapAndQuietExplanation}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Coûts sur place</h2>
          <p className="mb-2 text-xs text-muted">
            Par jour, milieu de gamme, en euros. <DataBadge kind="estimation" />
          </p>
          <ul className="space-y-1 text-sm">
            <li>Hébergement (chambre double) : ≈ {d.costs[0]} €</li>
            <li>Repas (par personne) : ≈ {d.costs[1]} €</li>
            <li>Transport local : ≈ {d.costs[2]} €</li>
            <li>Activités : ≈ {d.costs[3]} €</li>
          </ul>
          <p className="mt-2 text-xs text-muted">
            Monnaie locale : {d.currency} · Aéroports : {d.airports.map((a) => airportLabel(a)).join(", ")}
          </p>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <AlertTriangle size={18} className="text-orange-500" /> Pièges à éviter
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {d.traps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <Gem size={18} className="text-sage-600" /> Pépites
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {d.gems.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {d.events.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Événements et périodes clés</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {d.events.map((e) => (
              <li key={e.name} className="rounded-xl bg-sage-50 p-3">
                <p className="font-semibold">{e.name}</p>
                <p className="text-xs text-muted">
                  {e.months.map((m) => MONTHS_SHORT_FR[m - 1]).join(", ")} · impact : {e.impact.join(", ")}
                </p>
                {e.note && <p className="text-xs">{e.note}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Les dates exactes varient chaque année : vérifiez auprès de l&apos;office de tourisme officiel.</p>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="section-title flex-1">Conseils de voyageurs</h2>
          <Link href={`/communaute?destination=${d.slug}`} className="btn-link text-sm">
            Tous les conseils
          </Link>
          <Link href={`/communaute/nouveau?destination=${d.slug}`} className="btn-primary">
            Partager un conseil
          </Link>
        </div>
        {tips.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tips.map((t) => (
              <TipCard key={t.id} tip={t as unknown as TipView} categoryLabel={CATEGORY_LABELS[t.category]} loggedIn={!!user} compact />
            ))}
          </div>
        ) : (
          <Notice>Aucun conseil publié pour {d.name.fr} pour l&apos;instant. Soyez le premier à partager votre expérience.</Notice>
        )}
      </section>
    </div>
  );
}

function BestCard({ title, months }: { title: string; months: string[] }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
      <p className="font-display text-xl font-bold capitalize text-deep-900">{months.join(", ")}</p>
    </div>
  );
}
