"use client";
import { useEffect, useState } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { PriceInsight } from "@/lib/services/price-history";
import { apiGet } from "@/lib/client/fetcher";
import { Dino } from "@/components/Dino";
import { DataBadge, Spinner } from "@/components/ui";
import { formatMoney } from "@/lib/utils/money";
import { formatDateFr } from "@/lib/utils/dates";

type Insight = PriceInsight & { offerSummary?: string; historySource: string };

const REC = {
  buy_now: { title: "Acheter maintenant semble raisonnable", mood: "happy" as const, cls: "border-sage-400 bg-sage-50" },
  watch: { title: "Surveiller le prix", mood: "thinking" as const, cls: "border-sky-300 bg-sky-50" },
  compare_dates: { title: "Comparer d'autres dates", mood: "explorer" as const, cls: "border-orange-400 bg-orange-400/10" },
  insufficient_data: { title: "Données insuffisantes", mood: "sleeping" as const, cls: "border-sage-200 bg-white" },
};

export function InsightPanel({ query }: { query: string }) {
  const [data, setData] = useState<Insight | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError("");
    apiGet<Insight>(`/api/flights/insight?${query}`, ctrl.signal).then(setData).catch((e) => !ctrl.signal.aborted && setError(e.message));
    return () => ctrl.abort();
  }, [query]);

  if (error) return <p className="card p-4 text-sm text-muted">Analyse de prix indisponible : {error}</p>;
  if (!data) return <div className="card p-4"><Spinner label="DINO analyse l'historique des prix…" /></div>;
  const r = REC[data.recommendation];
  const chart = [
    ...data.series.map((p) => ({ date: p.date, prix: p.cents / 100 })),
    ...data.projection.map((p) => ({ date: p.date, tendance: p.midCents / 100, bande: [p.lowCents / 100, p.highCents / 100] as [number, number] })),
  ];
  return (
    <section className={`card border-2 p-4 ${r.cls}`} aria-label="Faut-il acheter maintenant ?" data-testid="insight">
      <div className="flex items-start gap-3">
        <Dino mood={r.mood} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-deep-900">{r.title}</h2>
            <DataBadge kind="prevision" />
            {data.isDemo && <DataBadge kind="demo" />}
          </div>
          <p className="text-sm text-deep-800">{data.recommendationText}</p>
          {data.reason && <p className="mt-1 text-xs text-muted">{data.reason}</p>}
        </div>
      </div>
      {data.available && data.stats && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat label="Prix actuel" value={formatMoney(data.currentCents, data.currency)} />
          <Stat label="Médiane observée" value={formatMoney(data.stats.medianCents, data.currency)} />
          <Stat label="Plus bas observé" value={formatMoney(data.stats.minCents, data.currency)} />
          <Stat label="Confiance" value={`${data.confidence.level} (${data.confidence.score}/100)`} />
          {data.verdict && <Stat label="Verdict" value={data.verdict} />}
          {data.change7d && <Stat label="Sur 7 jours" value={`${data.change7d.pct > 0 ? "+" : ""}${data.change7d.pct} %`} />}
          <Stat label="Réservation" value={`${data.leadDays} j avant le départ`} />
          <Stat label="Historique" value={`${data.stats.n} relevés sur ${data.stats.spanDays + 1} j`} />
        </div>
      )}
      {chart.length > 1 && (
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#e4eee2" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => formatDateFr(d, { day: "numeric", month: "short" })} fontSize={11} minTickGap={24} />
              <YAxis fontSize={11} width={48} tickFormatter={(v: number) => `${Math.round(v)}`} domain={["auto", "auto"]} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [Array.isArray(v) ? `${Math.round(v[0])}–${Math.round(v[1])} ${data.currency}` : `${Math.round(Number(v))} ${data.currency}`, String(name)]}
                labelFormatter={(d: unknown) => `Observé / projeté le ${formatDateFr(String(d))}`}
              />
              <Area dataKey="bande" name="Fourchette projetée" stroke="none" fill="#86ad83" fillOpacity={0.25} isAnimationActive={false} />
              <Line dataKey="prix" name="Prix observé (min. du jour)" stroke="#214636" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="tendance" name="Tendance projetée" stroke="#e8833a" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.factors.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {data.factors.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>{f.effect === "up" ? "↗" : f.effect === "down" ? "↘" : "→"}</span>
              <span>
                <strong>{f.label}</strong> ({f.kind}) : {f.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted">
        Source de l&apos;historique : {data.historySource}. Méthode : {data.method} Le graphique montre la date d&apos;observation du prix (quand on achète), pas la date du voyage.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-2">
      <p className="text-muted">{label}</p>
      <p className="font-semibold text-deep-900">{value}</p>
    </div>
  );
}
