"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Bell, Bookmark, Plus, Trash2 } from "lucide-react";
import type { FlightSearchResult } from "@/lib/services/flight-search";
import { apiGet, apiSend } from "@/lib/client/fetcher";
import { Dino } from "@/components/Dino";
import { EmptyState, ErrorBox, Notice, Spinner } from "@/components/ui";
import { PlaceInput } from "@/components/PlaceInput";
import { OfferCard } from "./OfferCard";
import { InsightPanel } from "./InsightPanel";
import { PriceCalendar } from "./PriceCalendar";
import { formatMoney } from "@/lib/utils/money";
import { addDays, todayIn } from "@/lib/utils/dates";

const SORTS = [
  { id: "best", label: "Meilleur choix" },
  { id: "price", label: "Moins cher" },
  { id: "duration", label: "Plus rapide" },
  { id: "departure", label: "Départ" },
] as const;

const STATUS_LABEL: Record<string, string> = { ok: "OK", empty: "aucun résultat", error: "erreur", timeout: "délai dépassé", not_configured: "non configuré" };

export function FlightsClient({ loggedIn, searchForm }: { loggedIn: boolean; searchForm: React.ReactNode }) {
  const sp = useSearchParams();
  const router = useRouter();
  const params = useMemo(() => new URLSearchParams(sp.toString()), [sp]);
  const trip = params.get("trip") ?? "roundtrip";
  const flexMonth = params.get("flexMonth");
  const hasSearch = trip === "multicity" ? !!params.get("legs") : !!(params.get("origin") && params.get("destination") && params.get("departDate"));
  const query = useMemo(() => {
    const p = new URLSearchParams(params);
    p.delete("flexMonth");
    return p.toString();
  }, [params]);

  const [data, setData] = useState<FlightSearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [shown, setShown] = useState(12);

  useEffect(() => {
    if (!hasSearch) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    apiGet<FlightSearchResult>(`/api/flights/search?${query}`, ctrl.signal)
      .then((d) => (setData(d), setShown(12)))
      .catch((e) => !ctrl.signal.aborted && (setError(e.message), setData(null)))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [query, hasSearch]);

  function update(patch: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v === null || v === "" ? p.delete(k) : p.set(k, v));
    router.replace(`/vols?${p}`, { scroll: false });
  }

  async function createAlert() {
    if (!loggedIn) return router.push(`/compte/connexion?next=${encodeURIComponent(`/vols?${params}`)}`);
    const cheapest = data?.offers.length ? Math.min(...data.offers.map((o) => o.price.estimatedTotalCents)) : null;
    try {
      await apiSend("/api/alerts", "POST", {
        kind: "route",
        criteria: {
          origin: params.get("origin"),
          destination: params.get("destination"),
          departDate: params.get("departDate"),
          returnDate: params.get("returnDate") || undefined,
          passengers: Number(params.get("adults") ?? 1) + Number(params.get("children") ?? 0),
          cabin: params.get("cabin") || "economy",
          maxStops: params.get("maxStops") ? Number(params.get("maxStops")) : undefined,
        },
        dropPct: 10,
        maxPrice: cheapest ? Math.floor(cheapest / 100) : undefined,
        currency: data?.currency ?? "EUR",
      });
      setToast("Alerte créée : DINO vous préviendra si le prix baisse d'au moins 10 % ou passe sous le prix actuel. Fréquence de vérification visible dans « Mes alertes ».");
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  async function saveSearch() {
    if (!loggedIn) return router.push(`/compte/connexion?next=${encodeURIComponent(`/vols?${params}`)}`);
    const label = `${params.get("origin")} → ${params.get("destination")} · ${params.get("departDate")}`;
    try {
      await apiSend("/api/saved-searches", "POST", { kind: "flight", label, params: Object.fromEntries(params.entries()) });
      setToast("Recherche enregistrée dans « Mes voyages ».");
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {trip === "multicity" ? <MultiCityForm initial={params.get("legs")} onSearch={(legs, extra) => router.push(`/vols?${new URLSearchParams({ trip: "multicity", legs: JSON.stringify(legs), ...extra })}`)} /> : searchForm}

      {flexMonth && params.get("origin") && params.get("destination") && (
        <PriceCalendar
          origin={params.get("origin")!}
          destination={params.get("destination")!}
          month={flexMonth}
          onMonth={(m) => update({ flexMonth: m })}
          onPick={(date) => update({ departDate: date, returnDate: trip === "roundtrip" ? addDays(date, Number(params.get("nights") ?? 7)) : null })}
        />
      )}

      {!hasSearch && !flexMonth && trip !== "multicity" && (
        <EmptyState mood="explorer" title="Où va-t-on ?">
          Indiquez un départ, une destination et des dates. DINO interroge toutes les sources configurées et affiche le coût total réel, bagages compris si besoin.
        </EmptyState>
      )}

      {toast && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-sage-300 bg-sage-50 p-3 text-sm">
          <Dino mood="happy" size={32} /> <span className="flex-1 pt-1">{toast}</span>
          <button type="button" className="text-xs underline" onClick={() => setToast("")}>
            Fermer
          </button>
        </div>
      )}

      {hasSearch && (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4" aria-label="Filtres">
            <Filters params={params} data={data} update={update} />
          </aside>
          <div className="min-w-0 space-y-4">
            {trip !== "multicity" && <InsightPanel query={query} />}
            <div className="flex flex-wrap items-center gap-2">
              {SORTS.map((s) => (
                <button key={s.id} type="button" onClick={() => update({ sort: s.id })} className={clsx("btn", (params.get("sort") ?? "best") === s.id ? "bg-deep-800 text-white" : "btn-ghost")}>
                  {s.label}
                </button>
              ))}
              {trip !== "multicity" && (
                <div className="ml-auto flex gap-2">
                  <button type="button" className="btn-ghost" onClick={saveSearch}>
                    <Bookmark size={16} /> Enregistrer
                  </button>
                  <button type="button" className="btn-primary" onClick={createAlert}>
                    <Bell size={16} /> Créer une alerte
                  </button>
                </div>
              )}
            </div>
            {loading && <Spinner label="DINO interroge les fournisseurs…" />}
            {error && <ErrorBox message={error} />}
            {data && !loading && (
              <>
                {data.warnings.map((w) => (
                  <Notice key={w} tone="warn">
                    {w}
                  </Notice>
                ))}
                <p className="text-xs text-muted">
                  {data.offers.length} offre{data.offers.length > 1 ? "s" : ""} affichée{data.offers.length > 1 ? "s" : ""} sur {data.totalBeforeFilters} · {data.explanations.sort} Sources :{" "}
                  {data.providers.map((p) => `${p.name} (${STATUS_LABEL[p.status]}${p.count ? `, ${p.count}` : ""})`).join(", ")}
                  {data.partial && " · Résultats partiels : une source n'a pas répondu."}
                </p>
                {data.offers.length === 0 ? (
                  <EmptyState mood="thinking" title="Aucune offre ne correspond">
                    Essayez d&apos;assouplir les filtres, d&apos;autres dates ou un aéroport voisin.
                  </EmptyState>
                ) : (
                  <>
                    {data.offers.slice(0, shown).map((o, i) => (
                      <OfferCard key={o.id} offer={o} highlight={i === 0 ? SORTS.find((s) => s.id === (params.get("sort") ?? "best"))?.label : undefined} />
                    ))}
                    {data.offers.length > shown && (
                      <button type="button" className="btn-ghost w-full" onClick={() => setShown((n) => n + 12)}>
                        Voir {Math.min(12, data.offers.length - shown)} offres de plus ({data.offers.length - shown} restantes)
                      </button>
                    )}
                  </>
                )}
                {data.nearby.length > 0 && (
                  <div className="card p-4 text-sm">
                    <p className="mb-2 font-semibold text-deep-900">Aéroports proches à comparer</p>
                    <div className="flex flex-wrap gap-2">
                      {data.nearby.map((n) => (
                        <button key={n.code} type="button" className="btn-ghost" onClick={() => update({ origin: n.code })}>
                          {n.label} · {n.km} km
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Filters({ params, data, update }: { params: URLSearchParams; data: FlightSearchResult | null; update: (p: Record<string, string | null>) => void }) {
  const carriers = params.getAll("carriers");
  return (
    <div className="card space-y-4 p-4 text-sm">
      <fieldset>
        <legend className="mb-1 font-semibold text-deep-900">Escales</legend>
        {[
          ["", "Peu importe"],
          ["0", "Direct uniquement"],
          ["1", "1 escale maximum"],
        ].map(([v, l]) => (
          <label key={v} className="flex items-center gap-2 py-0.5">
            <input type="radio" name="stops" checked={(params.get("maxStops") ?? "") === v} onChange={() => update({ maxStops: v })} /> {l}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 font-semibold text-deep-900">Bagages et conditions</legend>
        <label className="flex items-center gap-2 py-0.5">
          <input type="checkbox" checked={params.get("checkedBag") === "true"} onChange={(e) => update({ checkedBag: e.target.checked ? "true" : null })} /> J&apos;ai un bagage en soute
        </label>
        <label className="flex items-center gap-2 py-0.5">
          <input type="checkbox" checked={params.get("refundableOnly") === "true"} onChange={(e) => update({ refundableOnly: e.target.checked ? "true" : null })} /> Remboursable uniquement
        </label>
      </fieldset>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1 font-semibold text-deep-900">Horaires (heure locale)</legend>
        <label className="field">
          <span>Départ après</span>
          <select className="input" value={params.get("departAfter") ?? ""} onChange={(e) => update({ departAfter: e.target.value })}>
            <option value="">—</option>
            {[5, 7, 9, 12, 15, 18].map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Arrivée avant</span>
          <select className="input" value={params.get("arriveBefore") ?? ""} onChange={(e) => update({ arriveBefore: e.target.value })}>
            <option value="">—</option>
            {[12, 15, 18, 21, 23, 24].map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <label className="field">
        <span>Durée max d&apos;un trajet (h)</span>
        <select className="input" value={params.get("maxDurationHours") ?? ""} onChange={(e) => update({ maxDurationHours: e.target.value })}>
          <option value="">Peu importe</option>
          {[3, 5, 8, 12, 16, 24].map((h) => (
            <option key={h} value={h}>
              {h} h
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Coût total max ({data?.currency ?? "EUR"})</span>
        <input className="input" inputMode="numeric" defaultValue={params.get("maxPrice") ?? ""} onBlur={(e) => update({ maxPrice: e.target.value.replace(/[^\d]/g, "") })} />
      </label>
      {data && data.carriers.length > 0 && (
        <fieldset>
          <legend className="mb-1 font-semibold text-deep-900">Compagnies</legend>
          {data.carriers.map((c) => (
            <label key={c.code} className="flex items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={carriers.length === 0 || carriers.includes(c.code)}
                onChange={(e) => {
                  const all = data.carriers.map((x) => x.code);
                  const current = carriers.length ? carriers : all;
                  const next = e.target.checked ? [...current, c.code] : current.filter((x) => x !== c.code);
                  update({ carriers: next.length === all.length ? null : next.join(",") });
                }}
              />
              <span className="flex-1">{c.name}</span>
              <span className="text-xs text-muted">dès {formatMoney(c.minCents, data.currency)}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

type Leg = { origin: { code: string; label: string }; destination: { code: string; label: string }; date: string };

function MultiCityForm({ initial, onSearch }: { initial: string | null; onSearch: (legs: { origin: string; destination: string; date: string }[], extra: Record<string, string>) => void }) {
  const today = todayIn();
  const parsed: { origin: string; destination: string; date: string }[] = (() => {
    try {
      return initial ? JSON.parse(initial) : [];
    } catch {
      return [];
    }
  })();
  const [legs, setLegs] = useState<Leg[]>(
    parsed.length
      ? parsed.map((l) => ({ origin: { code: l.origin, label: l.origin }, destination: { code: l.destination, label: l.destination }, date: l.date }))
      : [
          { origin: { code: "PAR", label: "Paris (tous les aéroports)" }, destination: { code: "", label: "" }, date: addDays(today, 30) },
          { origin: { code: "", label: "" }, destination: { code: "", label: "" }, date: addDays(today, 37) },
        ],
  );
  const [adults, setAdults] = useState(1);
  const [error, setError] = useState("");
  const set = (i: number, patch: Partial<Leg>) => setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <form
      className="card space-y-3 p-4"
      aria-label="Itinéraire multi-destinations"
      onSubmit={(e) => {
        e.preventDefault();
        if (legs.some((l) => !l.origin.code || !l.destination.code)) return setError("Choisissez chaque ville dans la liste de suggestions.");
        if (legs.some((l, i) => i > 0 && l.date < legs[i - 1].date)) return setError("Les dates doivent se suivre.");
        setError("");
        onSearch(legs.map((l) => ({ origin: l.origin.code, destination: l.destination.code, date: l.date })), { adults: String(adults) });
      }}
    >
      <h2 className="font-display text-lg font-bold">Itinéraire multi-destinations</h2>
      {legs.map((l, i) => (
        <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_160px_auto]">
          <PlaceInput name={`o${i}`} label={`Trajet ${i + 1} : départ`} value={l.origin} onChange={(v) => set(i, { origin: v })} />
          <PlaceInput
            name={`d${i}`}
            label="Arrivée"
            value={l.destination}
            onChange={(v) => {
              set(i, { destination: v });
              if (legs[i + 1] && !legs[i + 1].origin.code) set(i + 1, { origin: v });
            }}
          />
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" min={today} value={l.date} onChange={(e) => set(i, { date: e.target.value })} />
          </label>
          <button type="button" className="btn-ghost" disabled={legs.length <= 2} aria-label={`Supprimer le trajet ${i + 1}`} onClick={() => setLegs((ls) => ls.filter((_, j) => j !== i))}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className="btn-ghost" disabled={legs.length >= 5} onClick={() => setLegs((ls) => [...ls, { origin: ls[ls.length - 1].destination, destination: { code: "", label: "" }, date: addDays(ls[ls.length - 1].date, 5) }])}>
          <Plus size={16} /> Ajouter un trajet
        </button>
        <label className="field w-28">
          <span>Adultes</span>
          <input className="input" type="number" min={1} max={9} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
        </label>
        <button type="submit" className="btn-accent ml-auto px-6 py-3">
          Rechercher
        </button>
      </div>
      {error && <p className="text-sm text-orange-600" role="alert">{error}</p>}
    </form>
  );
}
