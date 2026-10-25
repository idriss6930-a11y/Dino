/**
 * Bons plans : prix d'aller simple nettement sous l'estimation habituelle de la route.
 * Source = calendriers de prix des fournisseurs (démo ou prix en cache réels). Un « bon plan » n'est jamais
 * une promesse : c'est un prix observé, daté, à confirmer par une recherche.
 */
import { DESTINATIONS } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";
import { addDays, todayIn } from "@/lib/utils/dates";
import { estimateRoundTripCents } from "./estimates";
import { flightCalendar } from "./flight-search";
import { resolveAirports } from "./airports";

export type Deal = {
  slug: string;
  name: string;
  country: string;
  origin: string;
  destination: string;
  date: string;
  priceCents: number;
  currency: string;
  typicalCents: number;
  savingPct: number;
  sourceName: string;
  isDemo: boolean;
  foundAt?: string;
};

export async function findDeals(opts: { origin?: string; limit?: number; maxDestinations?: number; currency?: string } = {}) {
  const origin = resolveAirports(opts.origin ?? "PAR")[0];
  const currency = opts.currency ?? "EUR";
  const today = todayIn();
  const months = [addDays(today, 20).slice(0, 7), addDays(today, 50).slice(0, 7)];
  const candidates = DESTINATIONS.filter((d) => !d.airports.includes(origin)).slice(0, opts.maxDestinations ?? 24);
  const deals: Deal[] = [];
  let calendarAvailable = false;
  await Promise.all(
    candidates.map(async (d) => {
      for (const month of [...new Set(months)]) {
        const cal = await flightCalendar(origin, d.airports[0], month, currency).catch(() => null);
        if (!cal) continue;
        calendarAvailable ||= cal.available;
        const future = cal.days.filter((x) => x.date > addDays(today, 3));
        const best = future.sort((a, b) => a.totalCents - b.totalCents)[0];
        const typicalRt = estimateRoundTripCents(origin, d.airports[0], Number(month.slice(5, 7)));
        if (!best || !typicalRt || currency !== "EUR") continue;
        const typical = Math.round(typicalRt / 2);
        const saving = Math.round((1 - best.totalCents / typical) * 100);
        if (saving >= 15)
          deals.push({ slug: d.slug, name: d.name.fr, country: COUNTRIES[d.countryIso]?.fr ?? d.countryIso, origin, destination: d.airports[0], date: best.date, priceCents: best.totalCents, currency, typicalCents: typical, savingPct: saving, sourceName: best.sourceName, isDemo: best.isDemo, foundAt: best.foundAt });
      }
    }),
  );
  const bySlug = new Map<string, Deal>();
  for (const x of deals.sort((a, b) => b.savingPct - a.savingPct)) if (!bySlug.has(x.slug)) bySlug.set(x.slug, x);
  return {
    origin,
    deals: [...bySlug.values()].slice(0, opts.limit ?? 8),
    calendarAvailable,
    method: "Prix d'aller simple le plus bas du calendrier de la source, comparé à l'estimation DINO d'un aller simple sur cette route à cette saison (modèle distance + saison). Seuil : au moins 15 % sous l'estimation.",
  };
}
