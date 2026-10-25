"use client";
import { useEffect, useState } from "react";
import type { GeoJsonObject, Feature } from "geojson";
import { Trash2 } from "lucide-react";
import { DynamicMap } from "./DynamicMap";
import { apiSend } from "@/lib/client/fetcher";
import { ErrorBox } from "@/components/ui";

type Place = { id: string; countryIso: string; countryName: string; cityName: string; status: "visited" | "wishlist"; visitedFrom: string | null; visitedTo: string | null; memory: string };
type World = { places: Place[]; stats: { countries: number; continents: number; cities: number; worldPct: number; wishlistCountries: number; goalProgress: number; continentList: string[] } };
type Props = { iso: string; name: string; name_fr: string | null };

export function MyWorld({ initial, mapVisibility }: { initial: World; mapVisibility: "public" | "friends" | "private" }) {
  const [world, setWorld] = useState(initial);
  const [geo, setGeo] = useState<GeoJsonObject | null>(null);
  const [picked, setPicked] = useState<Props | null>(null);
  const [error, setError] = useState("");
  const [visibility, setVisibility] = useState(mapVisibility);
  const [city, setCity] = useState({ cityName: "", visitedFrom: "", visitedTo: "", memory: "" });
  useEffect(() => {
    fetch("/geo/countries.geo.json").then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
  }, []);
  const statusOf = (iso: string) => (world.places.some((p) => p.countryIso === iso && p.status === "visited") ? "visited" : world.places.some((p) => p.countryIso === iso && p.status === "wishlist") ? "wishlist" : null);

  async function save(body: Record<string, unknown>) {
    setError("");
    try {
      setWorld(await apiSend<World>("/api/world", "POST", body));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(id: string) {
    try {
      setWorld(await apiSend<World>(`/api/world/${id}`, "DELETE"));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const s = world.stats;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Pays visités", s.countries],
          ["Continents", s.continents],
          ["Villes", s.cities],
          ["% des 195 pays", `${s.worldPct} %`],
          ["Pays rêvés", s.wishlistCountries],
          ["Objectifs atteints", `${s.goalProgress} %`],
        ].map(([l, v]) => (
          <div key={String(l)} className="card p-3 text-center">
            <p className="text-2xl font-black text-deep-900">{v}</p>
            <p className="text-xs text-muted">{l}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden p-1">
          <DynamicMap
            center={[30, 10]}
            zoom={2}
            height={480}
            tiles={false}
            geojson={geo ?? undefined}
            geoKey={world.places.map((p) => p.id).join(",")}
            featureStyle={(f: Feature) => {
              const st = statusOf((f.properties as Props).iso);
              return { color: "#ffffff", weight: 0.6, fillOpacity: 1, fillColor: st === "visited" ? "#2d5a45" : st === "wishlist" ? "#e8833a" : "#e4eee2" };
            }}
            featureTooltip={(f) => (f.properties as Props).name_fr ?? (f.properties as Props).name}
            onFeatureClick={(f) => setPicked(f.properties as Props)}
          />
        </div>
        <aside className="card h-fit space-y-3 p-4 text-sm">
          {picked ? (
            <>
              <h2 className="font-display text-xl font-bold">{picked.name_fr ?? picked.name}</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => save({ countryIso: picked.iso, status: "visited" })}>
                  J&apos;y suis allé·e
                </button>
                <button type="button" className="btn-accent" onClick={() => save({ countryIso: picked.iso, status: "wishlist" })}>
                  J&apos;aimerais y aller
                </button>
              </div>
              <form
                className="space-y-2 border-t border-sage-100 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  save({ countryIso: picked.iso, status: "visited", cityName: city.cityName, visitedFrom: city.visitedFrom || null, visitedTo: city.visitedTo || null, memory: city.memory }).then(() =>
                    setCity({ cityName: "", visitedFrom: "", visitedTo: "", memory: "" }),
                  );
                }}
              >
                <p className="font-semibold">Ajouter une ville visitée</p>
                <input className="input" placeholder="Ville" value={city.cityName} onChange={(e) => setCity({ ...city, cityName: e.target.value })} required />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" type="date" aria-label="Du" value={city.visitedFrom} onChange={(e) => setCity({ ...city, visitedFrom: e.target.value })} />
                  <input className="input" type="date" aria-label="Au" value={city.visitedTo} onChange={(e) => setCity({ ...city, visitedTo: e.target.value })} />
                </div>
                <textarea className="input" rows={2} placeholder="Un souvenir (privé)" value={city.memory} onChange={(e) => setCity({ ...city, memory: e.target.value })} maxLength={2000} />
                <button type="submit" className="btn-ghost w-full">
                  Ajouter
                </button>
              </form>
            </>
          ) : (
            <p className="text-muted">Cliquez sur un pays de la carte pour l&apos;ajouter à vos pays visités ou à vos envies. Vert foncé = visité, orange = envie.</p>
          )}
          <div className="border-t border-sage-100 pt-3">
            <label className="field">
              <span>Qui peut voir ma carte ?</span>
              <select
                className="input"
                value={visibility}
                onChange={async (e) => {
                  const v = e.target.value as typeof visibility;
                  setVisibility(v);
                  await apiSend("/api/me", "PATCH", { mapVisibility: v }).catch((err) => setError(err.message));
                }}
              >
                <option value="private">Moi uniquement (par défaut)</option>
                <option value="friends">Mes amis (abonnements mutuels)</option>
                <option value="public">Tout le monde</option>
              </select>
            </label>
            <p className="mt-1 text-xs text-muted">Vos souvenirs et vos dates restent toujours privés. Seuls les pays et villes peuvent être partagés.</p>
          </div>
        </aside>
      </div>
      {error && <ErrorBox message={error} />}
      <section>
        <h2 className="section-title mb-3">Mes lieux</h2>
        {world.places.length === 0 ? (
          <p className="text-sm text-muted">Aucun lieu pour l&apos;instant.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {world.places.map((p) => (
              <li key={p.id} className="card flex items-start gap-3 p-3 text-sm">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${p.status === "visited" ? "bg-deep-700" : "bg-orange-500"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {p.cityName ? `${p.cityName}, ` : ""}
                    {p.countryName}
                  </p>
                  <p className="text-xs text-muted">
                    {p.status === "visited" ? "Visité" : "Envie"}
                    {p.visitedFrom ? ` · ${p.visitedFrom}${p.visitedTo ? ` → ${p.visitedTo}` : ""}` : ""}
                  </p>
                  {p.memory && <p className="mt-1 text-xs italic">{p.memory}</p>}
                </div>
                <button type="button" className="text-muted hover:text-orange-600" aria-label={`Retirer ${p.cityName || p.countryName}`} onClick={() => remove(p.id)}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
