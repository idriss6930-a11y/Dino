"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { apiGet } from "@/lib/client/fetcher";
import { DataBadge, Spinner } from "@/components/ui";
import { formatMoney } from "@/lib/utils/money";

type Day = { date: string; totalCents: number; currency: string; sourceName: string; isDemo: boolean; foundAt?: string };
type Cal = { days: Day[]; note: string; available: boolean; month: string; nextMonth: string };

const WEEK = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

/** Calendrier des prix d'un mois : chaque case = prix le plus bas connu pour un aller simple ce jour-là. */
export function PriceCalendar({ origin, destination, month, onPick, onMonth }: { origin: string; destination: string; month: string; onPick: (date: string) => void; onMonth: (m: string) => void }) {
  const [cal, setCal] = useState<Cal | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const ctrl = new AbortController();
    setCal(null);
    setError("");
    apiGet<Cal>(`/api/flights/calendar?${new URLSearchParams({ origin, destination, month })}`, ctrl.signal).then(setCal).catch((e) => !ctrl.signal.aborted && setError(e.message));
    return () => ctrl.abort();
  }, [origin, destination, month]);

  if (error) return <p className="card p-4 text-sm text-orange-600">{error}</p>;
  if (!cal) return <div className="card p-4"><Spinner label="Chargement du calendrier des prix…" /></div>;
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const byDate = new Map(cal.days.map((d) => [d.date, d]));
  const prices = cal.days.map((d) => d.totalCents).sort((a, b) => a - b);
  const low = prices[Math.floor(prices.length * 0.25)] ?? 0;
  const high = prices[Math.floor(prices.length * 0.75)] ?? 0;
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  return (
    <section className="card p-4" aria-label="Calendrier des prix">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" className="btn-ghost px-3 py-1" onClick={() => onMonth(prev)} aria-label="Mois précédent">
          ←
        </button>
        <h2 className="flex-1 text-center font-display font-bold capitalize text-deep-900">{label}</h2>
        <button type="button" className="btn-ghost px-3 py-1" onClick={() => onMonth(cal.nextMonth)} aria-label="Mois suivant">
          →
        </button>
      </div>
      {!cal.available ? (
        <p className="text-sm text-muted">{cal.note}</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
            {WEEK.map((w) => (
              <div key={w}>{w}</div>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const d = byDate.get(date);
              return (
                <button
                  key={date}
                  type="button"
                  disabled={!d}
                  onClick={() => onPick(date)}
                  className={clsx(
                    "flex min-h-14 flex-col items-center justify-center rounded-lg border text-xs",
                    !d && "border-transparent text-muted/50",
                    d && d.totalCents <= low && "border-sage-400 bg-sage-100 text-deep-900",
                    d && d.totalCents > low && d.totalCents < high && "border-sage-200 bg-white",
                    d && d.totalCents >= high && "border-orange-400/50 bg-orange-400/10",
                  )}
                >
                  <span className="font-semibold">{i + 1}</span>
                  {d && <span className="tabular-nums">{formatMoney(d.totalCents, d.currency, "fr-FR", { compact: true })}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            {cal.days[0] && <DataBadge kind={cal.days[0].isDemo ? "demo" : "cached"} />}
            <span>{cal.note}</span>
            <span>Vert = moins cher du mois, orange = plus cher. Cliquez un jour pour lancer la recherche.</span>
          </div>
        </>
      )}
    </section>
  );
}
