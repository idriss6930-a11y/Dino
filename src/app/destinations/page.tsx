import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import { DESTINATIONS, MONTHS_FR } from "@/data/destinations";
import { TAGS, type Tag } from "@/data/types";
import { COUNTRIES } from "@/data/countries";
import { PageHeader, ScoreBar } from "@/components/ui";
import { scoreMonths } from "@/lib/services/seasons";

export const metadata: Metadata = { title: "Destinations" };

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ tag?: string; mois?: string }> }) {
  const sp = await searchParams;
  const tag = sp.tag && sp.tag in TAGS ? (sp.tag as Tag) : undefined;
  const month = Math.min(12, Math.max(1, Number(sp.mois) || new Date().getUTCMonth() + 1));
  const list = DESTINATIONS.filter((d) => !tag || d.tags.includes(tag))
    .map((d) => ({ d, s: scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })))[month - 1] }))
    .sort((a, b) => b.s.overall - a.s.overall);
  const href = (p: { tag?: string; mois?: number }) => `/destinations?${new URLSearchParams(Object.entries({ tag, mois: String(month), ...p }).filter(([, v]) => v !== undefined) as [string, string][])}`;
  return (
    <>
      <PageHeader title="Destinations" subtitle={`${DESTINATIONS.length} destinations décrites par DINO, classées pour ${MONTHS_FR[month - 1]} (météo, prix et affluence évalués séparément).`} mood="explorer" />
      <div className="mb-3 flex flex-wrap gap-2">
        <Link href={href({ tag: undefined })} className={clsx("chip", !tag ? "border-deep-800 bg-deep-800 text-white" : "border-sage-200 bg-white")}>
          Toutes
        </Link>
        {Object.entries(TAGS).map(([k, l]) => (
          <Link key={k} href={href({ tag: k })} className={clsx("chip", tag === k ? "border-deep-800 bg-deep-800 text-white" : "border-sage-200 bg-white")}>
            {l}
          </Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-1">
        {MONTHS_FR.map((m, i) => (
          <Link key={m} href={href({ mois: i + 1 })} className={clsx("rounded-full px-3 py-1 text-xs", month === i + 1 ? "bg-orange-500 text-white" : "bg-white text-deep-800 hover:bg-sage-50")}>
            {m}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ d, s }) => (
          <Link key={d.slug} href={`/destinations/${d.slug}`} className="card space-y-2 p-4 hover:border-sage-300">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-lg font-bold text-deep-900">{d.name.fr}</span>
              <span className="text-xs text-muted">{COUNTRIES[d.countryIso]?.fr}</span>
            </div>
            <p className="line-clamp-2 text-sm text-deep-800">{d.summary}</p>
            <ScoreBar label="Météo" value={s.weather} />
            <ScoreBar label="Prix" value={s.price} tone="orange" />
            <ScoreBar label="Calme" value={s.crowd} tone="sky" />
            {s.flags.length > 0 && <p className="text-xs text-orange-600">{s.flags.join(" · ")}</p>}
          </Link>
        ))}
      </div>
    </>
  );
}
