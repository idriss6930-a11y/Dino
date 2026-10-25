"use client";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";

/** Leaflet manipule `window` : chargement uniquement côté navigateur. */
export const DynamicMap = dynamic(() => import("./LeafletMap"), { ssr: false, loading: () => <Spinner label="Chargement de la carte…" /> });
export type { MapPoint } from "./LeafletMap";
