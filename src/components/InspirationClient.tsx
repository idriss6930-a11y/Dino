"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Clock, Thermometer, Users } from "lucide-react";
import type { InspirationResult } from "@/lib/services/inspiration";
import { apiGet, qs } from "@/lib/client/fetcher";
import { PlaceInput } from "./PlaceInput";
import { DataBadge, EmptyState, ErrorBox, Notice, Spinner } from "./ui";
import { DynamicMap } from "./map/DynamicMap";
import { formatMoney } from "@/lib/utils/money";

type Res = { origin: string; results: InspirationResult[]; nothingFits: boolean; disclaimer: string; monthLabel: string };
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const CROWD = ["", "calme", "moyenne", "forte"];

export function InspirationClient({ tags, defaultOrigin }: { tags: Record<string, string>; defaultOrigin: { code: string; label: string } }) {
  const sp = useSearchParams();
  const router = useRouter();
  const g = (k: string, d = "") => sp.get(k) ?? d;
  const [origin, setOrigin] = useState(sp.get("origin") ? { code: g("origin"), label: g("origin") } : defaultOrigin);
  const [f, setF] = useState({
    budget: g("budget", "700"),
    budgetScope: g("budgetScope", "per_person"),
    travelers: g("travelers", "1"),
    nights: g("nights", "5"),
    month: g("month", "0"),
    tempMin: g("tempMin"),
    tempMax: g("tempMax"),
    maxFlightHours: g("maxFlightHours"),
    avoidCrowds: g("avoidCrowds") === "true",
    hiddenGems: g("hiddenGems") === "true",
  });
  const [selTags, setSelTags] = useState<string[]>(sp.getAll("tags"));
  const [data, setData] = useState<Res | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const query = useMemo(() => sp.toString(), [sp]);

  useEffect(() => {
    if (!sp.get("budget")) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    apiGet<Res>(`/api/inspiration?${query}`, ctrl.signal)
      .then(setData)
      .catch((e) => !ctrl.signal.aborted && setError(e.message))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [query, sp]);

  return (
    <div className="space-y-6">
      <form
        className="card space-y-4 p-4"
        aria-label="Critères d'inspiration"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/inspiration?${qs({ origin: origin.code, ...f, tags: selTags })}`);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <PlaceInput name="origin" label="Je pars de" value={origin} onChange={setOrigin} />
          </div>
          <label className="field">
            <span>Budget max (€)</span>
            <input className="input" inputMode="numeric" required value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value.replace(/[^\d]/g, "") })} />
          </label>
          <label className="field">
            <span>Budget</span>
            <select className="input" value={f.budgetScope} onChange={(e) => setF({ ...f, budgetScope: e.target.value })}>
              <option value="per_person">par personne</option>
              <option value="total">pour tout le groupe</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="field">
              <span>Voyageurs</span>
              <input className="input" type="number" min={1} max={10} value={f.travelers} onChange={(e) => setF({ ...f, travelers: e.target.value })} />
            </label>
            <label className="field">
              <span>Nuits</span>
              <input className="input" type="number" min={1} max={60} value={f.nights} onChange={(e) => setF({ ...f, nights: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">
            <span>Mois</span>
            <select className="input" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>
              <option value="0">Flexible (meilleur mois)</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="field">
              <span>T° min (°C)</span>
              <input className="input" inputMode="numeric" value={f.tempMin} onChange={(e) => setF({ ...f, tempMin: e.target.value.replace(/[^\d-]/g, "") })} />
            </label>
            <label className="field">
              <span>T° max (°C)</span>
              <input className="input" inputMode="numeric" value={f.tempMax} onChange={(e) => setF({ ...f, tempMax: e.target.value.replace(/[^\d-]/g, "") })} />
            </label>
          </div>
          <label className="field">
            <span>Durée de vol max</span>
            <select className="input" value={f.maxFlightHours} onChange={(e) => setF({ ...f, maxFlightHours: e.target.value })}>
              <option value="">Peu importe</option>
              {[2, 3, 5, 8, 12].map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-1 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.avoidCrowds} onChange={(e) => setF({ ...f, avoidCrowds: e.target.checked })} /> Éviter la foule
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={f.hiddenGems} onChange={(e) => setF({ ...f, hiddenGems: e.target.checked })} /> Destinations méconnues
            </label>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-deep-800">Mes envies</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tags).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={selTags.includes(k)}
                onClick={() => setSelTags((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
                className={clsx("chip", selTags.includes(k) ? "border-deep-800 bg-deep-800 text-white" : "border-sage-200 bg-white text-deep-800")}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn-accent px-6 py-3">
          Trouver où partir
        </button>
      </form>

      {loading && <Spinner label="DINO explore le monde pour vous…" />}
      {error && <ErrorBox message={error} />}
      {!sp.get("budget") && (
        <EmptyState mood="thinking" title="Dites-moi votre budget et vos envies">
          DINO estime pour chaque destination le vol, le logement et la vie sur place, puis choisit le meilleur mois. Il explique chaque proposition.
        </EmptyState>
      )}
      {data && !loading && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="section-title flex-1">
              {data.results.length} idée{data.results.length > 1 ? "s" : ""} · {data.monthLabel}
            </h2>
            <DataBadge kind="estimation" />
            <div className="flex rounded-full border border-sage-200 bg-white p-0.5 text-sm">
              {(["list", "map"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} className={clsx("rounded-full px-3 py-1", view === v && "bg-deep-800 text-white")}>
                  {v === "list" ? "Liste" : "Carte"}
                </button>
              ))}
            </div>
          </div>
          {data.nothingFits && <Notice tone="warn">Aucune destination n&apos;entre dans ce budget selon nos estimations : voici les plus proches. Essayez moins de nuits ou un autre mois.</Notice>}
          <Notice>{data.disclaimer}</Notice>
          {view === "map" ? (
            <div className="card overflow-hidden p-1">
              <DynamicMap
                center={[30, 10]}
                zoom={2}
                height={480}
                fitToPoints
                onPointClick={(slug) => router.push(`/destinations/${slug}`)}
                points={data.results.map((r) => ({ id: r.destination.slug, lat: r.destination.lat, lon: r.destination.lon, label: r.destination.name.fr, sub: `≈ ${formatMoney(r.estimate.perPersonCents, r.estimate.currency)} / pers. · ${r.monthName}`, color: r.fits ? "#e8833a" : "#a8c6a4" }))}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.results.map((r) => (
                <article key={r.destination.slug} className="card flex flex-col p-4" data-testid="inspiration-result">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/destinations/${r.destination.slug}`} className="font-display text-lg font-bold text-deep-900 hover:underline">
                        {r.destination.name.fr}
                      </Link>
                      <p className="text-xs text-muted">
                        {r.countryName} · {r.monthName}
                        {r.destination.hiddenGem && " · méconnue"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-orange-500">≈ {formatMoney(r.estimate.perPersonCents, r.estimate.currency)}</p>
                      <p className="text-[11px] text-muted">par personne</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-deep-800">{r.destination.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Thermometer size={12} /> {r.climate.tmax} °C · {r.climate.precip} mm
                    </span>
                    {r.flightHours && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> ≈ {r.flightHours} h de vol
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={12} /> affluence {CROWD[r.crowdLevel]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Vol ≈ {formatMoney(r.estimate.flightCents, r.estimate.currency)} · séjour ≈ {formatMoney(r.estimate.stayCents, r.estimate.currency)} (par pers.)
                  </p>
                  <ul className="mt-2 flex-1 space-y-0.5 text-xs">
                    {r.reasons.map((x) => (
                      <li key={x} className="text-deep-700">
                        ✓ {x}
                      </li>
                    ))}
                    {r.warnings.map((x) => (
                      <li key={x} className="text-orange-600">
                        ⚠ {x}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="btn-primary" href={`/vols?${qs({ origin: data.origin, destination: r.destination.airports[0], flexMonth: monthValue(r.month), trip: "roundtrip", nights: sp.get("nights") ?? "5" })}`}>
                      Voir les vrais prix
                    </Link>
                    <Link className="btn-ghost" href={`/budget?${qs({ destination: r.destination.slug, origin: data.origin, month: r.month, nights: sp.get("nights") ?? 5, travelers: sp.get("travelers") ?? 1 })}`}>
                      Budget détaillé
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Prochaine occurrence du mois (YYYY-MM). */
function monthValue(m: number) {
  const now = new Date();
  const y = now.getUTCMonth() + 1 > m ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return `${y}-${String(m).padStart(2, "0")}`;
}
