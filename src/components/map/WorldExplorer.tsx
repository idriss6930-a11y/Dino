"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { GeoJsonObject } from "geojson";
import { DynamicMap } from "./DynamicMap";
import { ScoreBar } from "@/components/ui";

export type WorldDest = {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  tags: string[];
  summary: string;
  months: { weather: number; price: number; crowd: number; overall: number; tmax: number; precip: number }[];
};

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const color = (v: number) => (v >= 80 ? "#2d5a45" : v >= 65 ? "#6a9467" : v >= 50 ? "#c9a227" : "#e8833a");

/** Carte du monde interactive : destinations colorées selon leur intérêt pour le mois choisi. */
export function WorldExplorer({ destinations, tags }: { destinations: WorldDest[]; tags: Record<string, string> }) {
  const [month, setMonth] = useState(new Date().getUTCMonth());
  const [tag, setTag] = useState<string | null>(null);
  const [criterion, setCriterion] = useState<"overall" | "weather" | "price" | "crowd">("overall");
  const [selected, setSelected] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoJsonObject | null>(null);
  useEffect(() => {
    fetch("/geo/countries.geo.json")
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);
  const list = useMemo(() => destinations.filter((d) => !tag || d.tags.includes(tag)), [destinations, tag]);
  const sel = destinations.find((d) => d.slug === selected);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => (
            <button key={m} type="button" onClick={() => setMonth(i)} className={clsx("rounded-full px-3 py-1 text-xs", month === i ? "bg-orange-500 text-white" : "bg-white text-deep-800 hover:bg-sage-50")}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            Colorer selon
            <select className="input w-auto py-1" value={criterion} onChange={(e) => setCriterion(e.target.value as typeof criterion)}>
              <option value="overall">Intérêt global</option>
              <option value="weather">Météo</option>
              <option value="price">Prix bas</option>
              <option value="crowd">Calme</option>
            </select>
          </label>
          <select className="input w-auto py-1" value={tag ?? ""} onChange={(e) => setTag(e.target.value || null)} aria-label="Filtrer par envie">
            <option value="">Toutes les envies</option>
            {Object.entries(tags).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">{list.length} destinations</span>
        </div>
        <div className="card overflow-hidden p-1">
          <DynamicMap
            center={[28, 10]}
            zoom={2}
            height={520}
            tiles={false}
            geojson={geo ?? undefined}
            featureStyle={() => ({ color: "#c9dcc6", weight: 0.6, fillColor: "#f8f3e7", fillOpacity: 1 })}
            featureTooltip={(f) => String((f.properties as { name_fr?: string; name?: string })?.name_fr ?? (f.properties as { name?: string })?.name ?? "")}
            onPointClick={setSelected}
            points={list.map((d) => ({ id: d.slug, lat: d.lat, lon: d.lon, label: d.name, sub: `${d.months[month][criterion]}/100 en ${MONTHS[month]}`, color: color(d.months[month][criterion]), active: d.slug === selected }))}
          />
        </div>
        <p className="text-xs text-muted">
          Fond de carte : Natural Earth (domaine public). Couleur : vert foncé ≥ 80, vert ≥ 65, jaune ≥ 50, orange en dessous. Scores éditoriaux indicatifs.
        </p>
      </div>
      <aside className="card h-fit p-4">
        {sel ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">{sel.country}</p>
            <h2 className="font-display text-xl font-bold text-deep-900">{sel.name}</h2>
            <p className="text-sm">{sel.summary}</p>
            <p className="text-xs text-muted">
              En {MONTHS[month]} : {sel.months[month].tmax} °C, {sel.months[month].precip} mm de pluie
            </p>
            <ScoreBar label="Météo" value={sel.months[month].weather} />
            <ScoreBar label="Prix" value={sel.months[month].price} tone="orange" />
            <ScoreBar label="Calme" value={sel.months[month].crowd} tone="sky" />
            <Link href={`/destinations/${sel.slug}`} className="btn-primary mt-2 w-full">
              Voir la destination
            </Link>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-muted">
            <p className="font-display text-lg font-bold text-deep-900">Explorez le monde</p>
            <p>Choisissez un mois, puis cliquez sur un point pour voir la météo, le niveau de prix et l&apos;affluence.</p>
            <ol className="list-decimal space-y-1 pl-5">
              {[...list]
                .sort((a, b) => b.months[month][criterion] - a.months[month][criterion])
                .slice(0, 6)
                .map((d) => (
                  <li key={d.slug}>
                    <button type="button" className="text-deep-800 underline" onClick={() => setSelected(d.slug)}>
                      {d.name}
                    </button>{" "}
                    ({d.months[month][criterion]})
                  </li>
                ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}
