/**
 * Normales climatiques calculées à partir des réanalyses ERA5 via l'API d'archives Open-Meteo
 * (https://open-meteo.com — licence CC BY 4.0, attribution obligatoire). Gratuit, sans clé, usage non commercial
 * gratuit ; un abonnement est requis pour un usage commercial (voir docs/PROVIDERS.md).
 * On moyenne 10 années complètes pour obtenir des valeurs mensuelles comparables aux normales indicatives.
 */
import { fetchJson } from "./http";

export type MonthlyClimate = { month: number; tmaxC: number; tminC: number; precipMm: number };

export async function fetchClimateNormals(lat: number, lon: number, endYear = new Date().getUTCFullYear() - 1, years = 10): Promise<{ months: MonthlyClimate[]; period: string }> {
  const start = `${endYear - years + 1}-01-01`;
  const end = `${endYear}-12-31`;
  const qs = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    start_date: start,
    end_date: end,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto",
  });
  const res = await fetchJson<{ daily: { time: string[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[] } }>(
    "open-meteo",
    `https://archive-api.open-meteo.com/v1/archive?${qs}`,
    { timeoutMs: 20000 },
  );
  return { months: aggregateDaily(res.daily), period: `${endYear - years + 1}-${endYear} (ERA5)` };
}

export function aggregateDaily(daily: { time: string[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[] }): MonthlyClimate[] {
  const acc = Array.from({ length: 12 }, () => ({ tmax: 0, nmax: 0, tmin: 0, nmin: 0, precip: 0, years: new Set<string>() }));
  daily.time.forEach((t, i) => {
    const m = Number(t.slice(5, 7)) - 1;
    const a = acc[m];
    const tx = daily.temperature_2m_max[i];
    const tn = daily.temperature_2m_min[i];
    const p = daily.precipitation_sum[i];
    if (tx != null) (a.tmax += tx), a.nmax++;
    if (tn != null) (a.tmin += tn), a.nmin++;
    if (p != null) a.precip += p;
    a.years.add(t.slice(0, 4));
  });
  return acc.map((a, i) => ({
    month: i + 1,
    tmaxC: Math.round((a.tmax / Math.max(1, a.nmax)) * 10) / 10,
    tminC: Math.round((a.tmin / Math.max(1, a.nmin)) * 10) / 10,
    precipMm: Math.round(a.precip / Math.max(1, a.years.size)),
  }));
}
