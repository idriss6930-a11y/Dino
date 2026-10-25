"use client";
/**
 * Carte Leaflet générique (rendu client uniquement). Tuiles OpenStreetMap avec attribution obligatoire ;
 * pour un trafic important, utilisez un fournisseur de tuiles commercial (voir docs/PROVIDERS.md).
 */
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { GeoJsonObject, Feature } from "geojson";
import type { PathOptions, LatLngBoundsExpression } from "leaflet";

export type MapPoint = { id: string; lat: number; lon: number; label: string; sub?: string; color?: string; radius?: number; active?: boolean };

function Fit({ bounds }: { bounds?: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, bounds]);
  return null;
}

export default function LeafletMap({
  center,
  zoom,
  points = [],
  onPointClick,
  geojson,
  featureStyle,
  onFeatureClick,
  featureTooltip,
  height = 420,
  fitToPoints,
  tiles = true,
  geoKey = "geo",
}: {
  center: [number, number];
  zoom: number;
  points?: MapPoint[];
  onPointClick?: (id: string) => void;
  geojson?: GeoJsonObject;
  featureStyle?: (f: Feature) => PathOptions;
  onFeatureClick?: (f: Feature) => void;
  featureTooltip?: (f: Feature) => string;
  height?: number | string;
  fitToPoints?: boolean;
  tiles?: boolean;
  /** Changer cette clé redessine la couche GeoJSON (ex. quand les styles dépendent de données mises à jour). */
  geoKey?: string;
}) {
  const bounds = fitToPoints && points.length > 1 ? (points.map((p) => [p.lat, p.lon]) as LatLngBoundsExpression) : undefined;
  return (
    <MapContainer center={center} zoom={zoom} style={{ height, width: "100%" }} scrollWheelZoom={false} worldCopyJump>
      {tiles && <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />}
      {geojson && (
        <GeoJSON
          key={geoKey}
          data={geojson}
          style={(f) => (f && featureStyle ? featureStyle(f) : {})}
          onEachFeature={(f, layer) => {
            if (featureTooltip) layer.bindTooltip(featureTooltip(f), { sticky: true });
            if (onFeatureClick) layer.on("click", () => onFeatureClick(f));
          }}
        />
      )}
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lon]}
          radius={p.radius ?? (p.active ? 10 : 7)}
          pathOptions={{ color: "#163327", weight: p.active ? 3 : 1.5, fillColor: p.color ?? "#e8833a", fillOpacity: 0.9 }}
          eventHandlers={{ click: () => onPointClick?.(p.id) }}
        >
          <Tooltip>
            <strong>{p.label}</strong>
            {p.sub && <div>{p.sub}</div>}
          </Tooltip>
        </CircleMarker>
      ))}
      <Fit bounds={bounds} />
    </MapContainer>
  );
}
