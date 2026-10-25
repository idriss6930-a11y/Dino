"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BudgetLine, Scenario } from "@/lib/services/budget";
import { apiGet, qs } from "@/lib/client/fetcher";
import { PlaceInput } from "./PlaceInput";
import { DataBadge, ErrorBox, Notice, Spinner } from "./ui";
import { formatMoney } from "@/lib/utils/money";

type Res = {
  destination: { slug: string; name: string };
  currency: string;
  scenarios: Scenario[];
  byMonth: { month: number; name: string; totalCents: number }[];
  cheapestMonth: { month: number; name: string; totalCents: number };
  disclaimer: string;
  comparison: { slug: string; name: string; value: number; eco: number; comfort: number; currency: string }[] | null;
};
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function BudgetClient({ cities }: { cities: { slug: string; name: string }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const g = (k: string, d: string) => sp.get(k) ?? d;
  const [origin, setOrigin] = useState({ code: g("origin", "PAR"), label: g("origin", "Paris (tous les aéroports)") });
  const [f, setF] = useState({
    destination: g("destination", cities[0]?.slug ?? ""),
    nights: g("nights", "7"),
    travelers: g("travelers", "2"),
    month: g("month", String(new Date().getUTCMonth() + 2 > 12 ? 1 : new Date().getUTCMonth() + 2)),
    flightPerPerson: g("flightPerPerson", ""),
    checkedBags: g("checkedBags", "0"),
    insurance: g("insurance", "true") === "true",
    budget: g("budget", ""),
  });
  const [compare, setCompare] = useState<string[]>(sp.getAll("compare"));
  const [data, setData] = useState<Res | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const query = sp.toString();

  useEffect(() => {
    if (!sp.get("destination")) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    apiGet<Res>(`/api/budget?${query}`, ctrl.signal)
      .then(setData)
      .catch((e) => !ctrl.signal.aborted && setError(e.message))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [query, sp]);

  return (
    <div className="space-y-6">
      <form
        className="card space-y-3 p-4"
        aria-label="Paramètres du budget"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/budget?${qs({ ...f, insurance: f.insurance ? "true" : "false", origin: origin.code, compare })}`);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">
            <span>Destination</span>
            <select className="input" value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })}>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <PlaceInput name="budget-origin" label="Départ" value={origin} onChange={setOrigin} />
          <label className="field">
            <span>Mois</span>
            <select className="input" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="field">
              <span>Nuits</span>
              <input className="input" type="number" min={1} max={60} value={f.nights} onChange={(e) => setF({ ...f, nights: e.target.value })} />
            </label>
            <label className="field">
              <span>Voyageurs</span>
              <input className="input" type="number" min={1} max={10} value={f.travelers} onChange={(e) => setF({ ...f, travelers: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Vol confirmé / pers. (€, optionnel)</span>
            <input className="input" inputMode="numeric" placeholder="sinon estimé" value={f.flightPerPerson} onChange={(e) => setF({ ...f, flightPerPerson: e.target.value.replace(/[^\d]/g, "") })} />
          </label>
          <label className="field">
            <span>Bagages en soute (total)</span>
            <input className="input" type="number" min={0} max={4} value={f.checkedBags} onChange={(e) => setF({ ...f, checkedBags: e.target.value })} />
          </label>
          <label className="field">
            <span>Mon budget max (€, optionnel)</span>
            <input className="input" inputMode="numeric" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value.replace(/[^\d]/g, "") })} />
          </label>
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input type="checkbox" checked={f.insurance} onChange={(e) => setF({ ...f, insurance: e.target.checked })} /> Inclure une assurance voyage
          </label>
        </div>
        <label className="field">
          <span>Comparer avec (jusqu&apos;à 4 destinations)</span>
          <select
            className="input"
            multiple
            size={4}
            value={compare}
            onChange={(e) => setCompare([...e.target.selectedOptions].map((o) => o.value).slice(0, 4))}
          >
            {cities
              .filter((c) => c.slug !== f.destination)
              .map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <button type="submit" className="btn-accent px-6 py-3">
          Calculer le budget total
        </button>
      </form>

      {loading && <Spinner label="Calcul du budget…" />}
      {error && <ErrorBox message={error} />}
      {data && !loading && (
        <>
          <Notice>{data.disclaimer}</Notice>
          <div className="grid gap-4 lg:grid-cols-3" data-testid="budget-scenarios">
            {data.scenarios.map((s) => (
              <ScenarioCard key={s.id} s={s} currency={data.currency} highlight={s.id === "value"} />
            ))}
          </div>
          <section className="card p-4">
            <h2 className="mb-1 font-display text-lg font-bold">Le même voyage selon le mois</h2>
            <p className="mb-3 text-xs text-muted">
              Scénario « meilleur rapport qualité-prix ». Mois le moins cher : <strong>{data.cheapestMonth.name}</strong> (≈ {formatMoney(data.cheapestMonth.totalCents, data.currency)}). <DataBadge kind="estimation" />
            </p>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={data.byMonth.map((m) => ({ name: m.name.slice(0, 4), total: Math.round(m.totalCents / 100), month: m.month }))}>
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} width={52} />
                  <Tooltip formatter={(v: unknown) => [`${v} ${data.currency}`, "Total estimé"]} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {data.byMonth.map((m) => (
                      <Cell key={m.month} fill={m.month === data.cheapestMonth.month ? "#e8833a" : "#86ad83"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          {data.comparison && (
            <section className="card overflow-x-auto p-4">
              <h2 className="mb-3 font-display text-lg font-bold">Comparaison de destinations</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-1">Destination</th>
                    <th>Économique</th>
                    <th>Qualité-prix</th>
                    <th>Confort</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.comparison]
                    .sort((a, b) => a.value - b.value)
                    .map((c) => (
                      <tr key={c.slug} className="border-t border-sage-100">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td>{formatMoney(c.eco, c.currency)}</td>
                        <td className="font-semibold">{formatMoney(c.value, c.currency)}</td>
                        <td>{formatMoney(c.comfort, c.currency)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ScenarioCard({ s, currency, highlight }: { s: Scenario; currency: string; highlight?: boolean }) {
  return (
    <article className={clsx("card p-4", highlight && "border-2 border-sage-400")}>
      <p className="font-display text-lg font-bold text-deep-900">{s.name}</p>
      <p className="text-3xl font-black text-deep-900">{formatMoney(s.totalCents, currency)}</p>
      <p className="text-xs text-muted">soit {formatMoney(s.perPersonCents, currency)} par personne</p>
      {s.fitsBudget !== null && <p className={clsx("mt-1 text-xs font-semibold", s.fitsBudget ? "text-deep-700" : "text-orange-600")}>{s.fitsBudget ? "✓ Dans votre budget" : "✗ Au-dessus de votre budget"}</p>}
      <ul className="mt-3 space-y-1 text-sm">
        {s.lines.map((l: BudgetLine) => (
          <li key={l.key} className="flex items-baseline justify-between gap-2" title={l.detail}>
            <span>
              {l.label} <span className={clsx("text-[10px]", l.nature === "confirmé" ? "text-deep-700" : "text-amber-700")}>({l.nature})</span>
            </span>
            <span className="tabular-nums">{formatMoney(l.cents, currency)}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs text-muted">
        {s.tradeoffs.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </article>
  );
}
