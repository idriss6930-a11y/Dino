"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Bell, ExternalLink, MapPin, Star } from "lucide-react";
import type { RankedHotelOffer } from "@/lib/services/hotel-search";
import type { ProviderRunStatus } from "@/lib/providers/types";
import { apiGet, apiSend, qs } from "@/lib/client/fetcher";
import { DataBadge, EmptyState, ErrorBox, Notice, Spinner, sourceKind } from "@/components/ui";
import { DynamicMap } from "@/components/map/DynamicMap";
import { formatMoney } from "@/lib/utils/money";
import { addDays, todayIn } from "@/lib/utils/dates";

type Result = {
  mode: "live" | "demo";
  destination: { slug: string; name: string; lat: number; lon: number; airports: string[] };
  nights: number;
  currency: string;
  offers: RankedHotelOffer[];
  totalBeforeFilters: number;
  neighborhoods: string[];
  amenities: string[];
  providers: ProviderRunStatus[];
  partial: boolean;
  warnings: string[];
  explanation: string;
};

const BOARD: Record<string, string> = { room_only: "Logement seul", breakfast: "Petit-déjeuner inclus", half_board: "Demi-pension", full_board: "Pension complète", unknown: "Repas non précisés" };
const TYPES: Record<string, string> = { hotel: "Hôtel", hostel: "Auberge", apartment: "Appartement", guesthouse: "Maison d'hôtes" };

export function HotelsClient({ cities, loggedIn }: { cities: { slug: string; name: string }[]; loggedIn: boolean }) {
  const sp = useSearchParams();
  const router = useRouter();
  const params = useMemo(() => new URLSearchParams(sp.toString()), [sp]);
  const today = todayIn();
  const [form, setForm] = useState({
    city: params.get("city") ?? cities[0]?.slug ?? "",
    checkin: params.get("checkin") ?? addDays(today, 30),
    checkout: params.get("checkout") ?? addDays(today, 34),
    adults: params.get("adults") ?? "2",
    rooms: params.get("rooms") ?? "1",
  });
  const has = !!(params.get("city") && params.get("checkin") && params.get("checkout"));
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!has) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    apiGet<Result>(`/api/hotels/search?${params}`, ctrl.signal)
      .then(setData)
      .catch((e) => !ctrl.signal.aborted && (setError(e.message), setData(null)))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [params, has]);

  function update(patch: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v === null || v === "" ? p.delete(k) : p.set(k, v));
    router.replace(`/hotels?${p}`, { scroll: false });
  }

  async function alertFor(o: RankedHotelOffer) {
    if (!loggedIn) return router.push(`/compte/connexion?next=${encodeURIComponent(`/hotels?${params}`)}`);
    try {
      await apiSend("/api/alerts", "POST", {
        kind: "hotel",
        criteria: { citySlug: params.get("city"), checkin: params.get("checkin"), checkout: params.get("checkout"), passengers: Number(params.get("adults") ?? 2), propertyName: o.property.name },
        dropPct: 10,
        maxPrice: Math.floor(o.price.estimatedTotalCents / 100),
        currency: data?.currency ?? "EUR",
      });
      setToast(`Alerte créée pour ${o.property.name}.`);
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  const types = params.getAll("types");
  return (
    <div className="space-y-6">
      <form
        className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
        aria-label="Recherche d'hôtels"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/hotels?${qs(form)}`);
        }}
      >
        <label className="field lg:col-span-2">
          <span>Ville</span>
          <select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Arrivée</span>
          <input className="input" type="date" min={today} value={form.checkin} onChange={(e) => setForm({ ...form, checkin: e.target.value })} />
        </label>
        <label className="field">
          <span>Départ</span>
          <input className="input" type="date" min={addDays(form.checkin, 1)} value={form.checkout} onChange={(e) => setForm({ ...form, checkout: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="field">
            <span>Adultes</span>
            <input className="input" type="number" min={1} max={12} value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} />
          </label>
          <label className="field">
            <span>Chambres</span>
            <input className="input" type="number" min={1} max={6} value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
          </label>
        </div>
        <button className="btn-accent self-end py-3" type="submit">
          Comparer
        </button>
      </form>

      {!has && (
        <EmptyState mood="sleeping" title="Où dormir ?">
          Choisissez une ville et vos dates : DINO rapproche les mêmes établissements entre fournisseurs et compare des offres équivalentes (mêmes dates, même occupation).
        </EmptyState>
      )}
      {toast && <Notice>{toast}</Notice>}
      {loading && <Spinner label="Comparaison des hébergements…" />}
      {error && <ErrorBox message={error} />}

      {data && has && !loading && (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="card h-fit space-y-4 p-4 text-sm" aria-label="Filtres">
            <label className="field">
              <span>Trier par</span>
              <select className="input" value={params.get("sort") ?? "value"} onChange={(e) => update({ sort: e.target.value })}>
                <option value="value">Rapport qualité-prix</option>
                <option value="price">Prix total</option>
                <option value="rating">Note</option>
                <option value="distance">Distance du centre</option>
              </select>
            </label>
            <label className="field">
              <span>Prix max par nuit ({data.currency})</span>
              <input className="input" inputMode="numeric" defaultValue={params.get("maxPerNight") ?? ""} onBlur={(e) => update({ maxPerNight: e.target.value.replace(/[^\d]/g, "") })} />
            </label>
            <label className="field">
              <span>Note minimale (/10)</span>
              <select className="input" value={params.get("minRating") ?? ""} onChange={(e) => update({ minRating: e.target.value })}>
                <option value="">Peu importe</option>
                {[7, 8, 8.5, 9].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Étoiles minimum</span>
              <select className="input" value={params.get("minStars") ?? ""} onChange={(e) => update({ minStars: e.target.value })}>
                <option value="">Peu importe</option>
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="mb-1 font-semibold text-deep-900">Type</legend>
              {Object.entries(TYPES).map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={types.includes(k)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...types, k] : types.filter((t) => t !== k);
                      const p = new URLSearchParams(params);
                      p.delete("types");
                      next.forEach((t) => p.append("types", t));
                      router.replace(`/hotels?${p}`, { scroll: false });
                    }}
                  />
                  {l}
                </label>
              ))}
            </fieldset>
            <label className="field">
              <span>Quartier</span>
              <select className="input" value={params.get("neighborhood") ?? ""} onChange={(e) => update({ neighborhood: e.target.value })}>
                <option value="">Tous</option>
                {data.neighborhoods.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Distance max du centre</span>
              <select className="input" value={params.get("maxDistanceKm") ?? ""} onChange={(e) => update({ maxDistanceKm: e.target.value })}>
                <option value="">Peu importe</option>
                {[1, 2, 3, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} km
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={params.get("breakfast") === "true"} onChange={(e) => update({ breakfast: e.target.checked ? "true" : null })} /> Petit-déjeuner inclus
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={params.get("refundable") === "true"} onChange={(e) => update({ refundable: e.target.checked ? "true" : null })} /> Annulation gratuite
            </label>
          </aside>

          <div className="min-w-0 space-y-4">
            {data.warnings.map((w) => (
              <Notice key={w} tone="warn">
                {w}
              </Notice>
            ))}
            <div className="card overflow-hidden p-1">
              <DynamicMap
                center={[data.destination.lat, data.destination.lon]}
                zoom={13}
                height={320}
                fitToPoints
                onPointClick={(id) => {
                  setActive(id);
                  document.getElementById(`hotel-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                points={[
                  { id: "center", lat: data.destination.lat, lon: data.destination.lon, label: `Centre de ${data.destination.name}`, color: "#214636", radius: 6 },
                  ...data.offers.map((o) => ({
                    id: o.id,
                    lat: o.property.lat,
                    lon: o.property.lon,
                    label: o.property.name,
                    sub: `${formatMoney(o.price.perNightCents, o.price.currency)} / nuit`,
                    active: active === o.id,
                  })),
                ]}
              />
            </div>
            <p className="text-xs text-muted">
              {data.offers.length} hébergement(s) sur {data.totalBeforeFilters} · {data.nights} nuit(s) · {data.explanation} Sources : {data.providers.map((p) => `${p.name} (${p.status}, ${p.count})`).join(", ")}
            </p>
            {data.offers.length === 0 && <EmptyState title="Aucun hébergement ne correspond à ces filtres" />}
            {data.offers.map((o) => (
              <article key={o.id} id={`hotel-${o.id}`} className={clsx("card grid gap-4 p-4 md:grid-cols-[1fr_auto]", active === o.id && "ring-2 ring-orange-400")} data-testid="hotel-offer" onMouseEnter={() => setActive(o.id)}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <DataBadge kind={sourceKind(o.source)} />
                    <span className="text-muted">via {o.source.name}</span>
                    {o.alsoFrom?.length ? <span className="text-muted">· aussi chez {o.alsoFrom.map((a) => `${a.source.name} (${formatMoney(a.totalCents, a.currency)})`).join(", ")}</span> : null}
                  </div>
                  <h3 className="font-display text-lg font-bold text-deep-900">{o.property.name}</h3>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span>{TYPES[o.property.type]}</span>
                    {o.property.stars ? (
                      <span className="flex items-center gap-0.5">
                        {o.property.stars} <Star size={12} fill="currentColor" />
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {o.property.neighborhood ?? "—"} · {o.property.distanceToCenterKm.toFixed(1)} km du centre
                    </span>
                  </p>
                  {o.property.rating ? (
                    <p className="text-sm">
                      <span className="rounded-lg bg-deep-800 px-2 py-0.5 font-bold text-white">{o.property.rating.score.toFixed(1)}</span>{" "}
                      <span className="text-muted">
                        /{o.property.rating.scale} · {o.property.rating.count} avis ({o.property.rating.sourceName})
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Pas de note disponible</p>
                  )}
                  <p className="text-sm">
                    {o.roomName} · {BOARD[o.board]} ·{" "}
                    {o.cancellation.refundable ? `Annulation gratuite${o.cancellation.freeUntil ? ` jusqu'au ${o.cancellation.freeUntil}` : ""}` : o.cancellation.refundable === false ? "Non remboursable" : "Conditions d'annulation non précisées"}
                  </p>
                  {o.property.amenities.length > 0 && <p className="text-xs text-muted">{o.property.amenities.join(" · ")}</p>}
                  <p className="text-xs text-deep-700">
                    {o.valueScore != null && <strong>Qualité-prix {o.valueScore.toFixed(1)}/10 : </strong>}
                    {o.valueExplanation}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1 border-t border-sage-100 pt-3 md:w-56 md:items-end md:border-l md:border-t-0 md:pl-4 md:pt-0 md:text-right">
                  <p className="text-xs text-muted">{formatMoney(o.price.perNightCents, o.price.currency)} / nuit</p>
                  <p className="text-2xl font-black text-deep-900">{formatMoney(o.price.estimatedTotalCents, o.price.currency)}</p>
                  <p className="text-xs text-muted">total estimé pour {o.nights} nuit(s)</p>
                  <ul className="text-xs text-muted">
                    {o.price.lines.map((l, i) => (
                      <li key={i}>
                        {l.label} : {formatMoney(l.cents, o.price.currency)}
                        {!l.included && " (à payer sur place)"}
                      </li>
                    ))}
                  </ul>
                  {o.booking.type === "unavailable" ? (
                    <p className="mt-2 rounded-lg bg-sage-100 px-2 py-1 text-xs text-deep-700">{o.booking.label}</p>
                  ) : (
                    <a href={o.booking.url} target="_blank" rel="noopener noreferrer sponsored" className="btn-accent mt-2">
                      {o.booking.label} <ExternalLink size={14} />
                    </a>
                  )}
                  <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-deep-700" onClick={() => alertFor(o)}>
                    <Bell size={12} /> Alerte prix
                  </button>
                </div>
              </article>
            ))}
            <p className="text-xs text-muted">
              Budget total du voyage ?{" "}
              <a className="underline" href={`/budget?${qs({ destination: data.destination.slug, nights: data.nights, travelers: params.get("adults") ?? 2 })}`}>
                Estimer vol + séjour + vie sur place
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
