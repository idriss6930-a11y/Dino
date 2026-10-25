import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { Status } from "@/lib/types";
import { ErrorBox, Notice } from "./ui";

let cached: Status | null = null;

/** Rappelle en permanence si les données affichées sont fictives. */
export function DemoBanner() {
  const [status, setStatus] = useState<Status | null>(cached);
  const [error, setError] = useState("");
  useEffect(() => {
    if (cached) return;
    apiGet<Status>("/api/status")
      .then((st) => {
        cached = st;
        setStatus(st);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <ErrorBox message={error} />;
  if (!status) return null;
  const demo = [status.flights.mode === "demo" && "les vols", status.hotels.mode === "demo" && "les hôtels"].filter(Boolean);
  if (!demo.length) return null;
  return <Notice>Mode démonstration : {demo.join(" et ")} affichés sont fictifs, marqués « Démo », et ne sont pas réservables.</Notice>;
}
