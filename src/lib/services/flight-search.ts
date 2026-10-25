/**
 * Service de comparaison de vols : validation → résolution des aéroports → interrogation parallèle des
 * fournisseurs → normalisation des devises → déduplication → filtres/tri → enregistrement de l'historique.
 */
import { z } from "zod";
import { zBool } from "@/lib/utils/zod";
import { flightDataMode, flightProviders } from "@/lib/providers/registry";
import { convertCents, fxNote, getFxTable, type FxTable } from "@/lib/providers/fx";
import type { Cabin, FlightOffer, FlightSearchParams, ProviderRunStatus } from "@/lib/providers/types";
import { addDays, daysBetween, isIsoDate, todayIn } from "@/lib/utils/dates";
import { nearbyAirports, resolveAirports } from "./airports";
import { runProviders } from "./run-providers";
import { recordFlightObservations } from "./price-history";
import { UserFacingError } from "./errors";

export { UserFacingError };

const iata = z.string().trim().min(3).max(40);
const isoDate = z.string().refine(isIsoDate, "date invalide (AAAA-MM-JJ)");

export const flightQuerySchema = z
  .object({
    trip: z.enum(["oneway", "roundtrip", "multicity"]).default("roundtrip"),
    origin: iata.optional(),
    destination: iata.optional(),
    departDate: isoDate.optional(),
    returnDate: isoDate.optional(),
    legs: z.array(z.object({ origin: iata, destination: iata, date: isoDate })).max(5).optional(),
    adults: z.coerce.number().int().min(1).max(9).default(1),
    children: z.coerce.number().int().min(0).max(8).default(0),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
    currency: z.string().regex(/^[A-Z]{3}$/).default("EUR"),
    maxStops: z.coerce.number().int().min(0).max(3).optional(),
    maxDurationHours: z.coerce.number().min(1).max(72).optional(),
    departAfter: z.coerce.number().int().min(0).max(23).optional(),
    departBefore: z.coerce.number().int().min(1).max(24).optional(),
    arriveBefore: z.coerce.number().int().min(1).max(24).optional(),
    carriers: z.array(z.string()).optional(),
    checkedBag: zBool(false),
    refundableOnly: zBool(false),
    maxPrice: z.coerce.number().positive().optional(),
    sort: z.enum(["best", "price", "duration", "departure"]).default("best"),
  })
  .superRefine((q, ctx) => {
    if (q.trip === "multicity") {
      if (!q.legs || q.legs.length < 2) ctx.addIssue({ code: "custom", message: "Un itinéraire multi-destinations nécessite au moins 2 trajets", path: ["legs"] });
      return;
    }
    if (!q.origin) ctx.addIssue({ code: "custom", message: "Départ requis", path: ["origin"] });
    if (!q.destination) ctx.addIssue({ code: "custom", message: "Destination requise", path: ["destination"] });
    if (!q.departDate) ctx.addIssue({ code: "custom", message: "Date de départ requise", path: ["departDate"] });
    if (q.trip === "roundtrip" && !q.returnDate) ctx.addIssue({ code: "custom", message: "Date de retour requise", path: ["returnDate"] });
    if (q.departDate && q.returnDate && daysBetween(q.departDate, q.returnDate) < 0)
      ctx.addIssue({ code: "custom", message: "Le retour doit suivre le départ", path: ["returnDate"] });
  });

export type FlightQuery = z.infer<typeof flightQuerySchema>;

export type FlightSearchResult = {
  mode: "live" | "demo";
  currency: string;
  offers: FlightOffer[];
  totalBeforeFilters: number;
  providers: ProviderRunStatus[];
  partial: boolean;
  fx: { source: FxTable["source"]; date: string };
  searched: { slices: FlightSearchParams["slices"]; airportsCombos: number };
  carriers: { code: string; name: string; minCents: number }[];
  nearby: { code: string; label: string; km: number }[];
  explanations: { sort: string };
  warnings: string[];
};

function buildSlices(q: FlightQuery): { origin: string[]; destination: string[]; date: string }[] {
  if (q.trip === "multicity") {
    return q.legs!.map((l) => ({ origin: resolveAirports(l.origin), destination: resolveAirports(l.destination), date: l.date }));
  }
  const o = resolveAirports(q.origin!);
  const d = resolveAirports(q.destination!);
  const out = [{ origin: o, destination: d, date: q.departDate! }];
  if (q.trip === "roundtrip") out.push({ origin: d, destination: o, date: q.returnDate! });
  return out;
}

/** Combinaisons d'aéroports pour les codes « ville » (ex. PAR → CDG/ORY), limitées pour maîtriser le coût d'API. */
function expandCombos(slices: { origin: string[]; destination: string[]; date: string }[], max = 4): FlightSearchParams["slices"][] {
  if (slices.length > 2) return [slices.map((s) => ({ origin: s.origin[0], destination: s.destination[0], date: s.date }))];
  const [out, back] = slices;
  const combos: FlightSearchParams["slices"][] = [];
  for (const o of out.origin.slice(0, 3)) {
    for (const d of out.destination.slice(0, 3)) {
      if (o === d) continue;
      const c = [{ origin: o, destination: d, date: out.date }];
      if (back) c.push({ origin: d, destination: o, date: back.date });
      combos.push(c);
      if (combos.length >= max) return combos;
    }
  }
  return combos;
}

function signature(o: FlightOffer) {
  return o.slices.map((s) => s.segments.map((g) => `${g.flightNumber}@${g.departLocal}`).join("+")).join("/");
}

/** Convertit toutes les offres dans la devise d'affichage, en conservant le montant d'origine. */
export function normalizeCurrency(offers: FlightOffer[], currency: string, fx: FxTable): FlightOffer[] {
  return offers.map((o) => {
    const from = o.price.currency;
    if (from === currency) return o;
    const conv = (c: number) => convertCents(c, from, currency, fx);
    return {
      ...o,
      price: {
        ...o.price,
        currency,
        ticketTotalCents: conv(o.price.ticketTotalCents),
        perPassengerCents: conv(o.price.perPassengerCents),
        estimatedTotalCents: conv(o.price.estimatedTotalCents),
        lines: o.price.lines.map((l) => ({ ...l, cents: conv(l.cents) })),
        fxRateNote: fxNote(from, currency, fx),
      },
      baggage: { ...o.baggage, checkedBagFeeCents: o.baggage.checkedBagFeeCents == null ? null : conv(o.baggage.checkedBagFeeCents) },
    };
  });
}

/** Regroupe les offres identiques (mêmes vols, mêmes horaires) venant de sources différentes. */
export function dedupeOffers(offers: FlightOffer[]): FlightOffer[] {
  const map = new Map<string, FlightOffer>();
  for (const o of offers) {
    const sig = `${signature(o)}|${o.baggage.note ?? ""}|${o.conditions.refundable}`;
    const prev = map.get(sig);
    if (!prev) {
      map.set(sig, o);
      continue;
    }
    if (prev.source.id === o.source.id) {
      if (o.price.ticketTotalCents < prev.price.ticketTotalCents) map.set(sig, { ...o, alsoFrom: prev.alsoFrom });
      continue;
    }
    const [best, other] = o.price.ticketTotalCents < prev.price.ticketTotalCents ? [o, prev] : [prev, o];
    map.set(sig, {
      ...best,
      alsoFrom: [...(best.alsoFrom ?? []), ...(other.alsoFrom ?? []), { source: other.source, totalCents: other.price.ticketTotalCents, currency: other.price.currency }],
    });
  }
  return [...map.values()];
}

/** Ajoute au coût estimé les frais connus correspondant aux besoins exprimés (ex. bagage en soute). */
export function applyNeeds(offers: FlightOffer[], q: Pick<FlightQuery, "checkedBag">): FlightOffer[] {
  return offers.map((o) => {
    let est = o.price.ticketTotalCents;
    if (q.checkedBag) {
      const bagFee = o.price.lines.find((l) => l.kind === "fee" && !l.included && /bagage/i.test(l.label));
      if (bagFee) est += bagFee.cents;
    }
    return { ...o, price: { ...o.price, estimatedTotalCents: est } };
  });
}

const hourOf = (local: string) => Number(local.slice(11, 13)) + Number(local.slice(14, 16)) / 60;

export function filterOffers(offers: FlightOffer[], q: FlightQuery): FlightOffer[] {
  return offers.filter((o) => {
    if (q.maxStops !== undefined && o.slices.some((s) => s.stops > q.maxStops!)) return false;
    if (q.maxDurationHours && o.slices.some((s) => s.durationMinutes > q.maxDurationHours! * 60)) return false;
    const first = o.slices[0];
    if (q.departAfter !== undefined && hourOf(first.departLocal) < q.departAfter) return false;
    if (q.departBefore !== undefined && hourOf(first.departLocal) > q.departBefore) return false;
    if (q.arriveBefore !== undefined && (first.dayShift > 0 || hourOf(first.arriveLocal) > q.arriveBefore)) return false;
    if (q.carriers?.length && !o.slices.every((s) => s.segments.every((g) => q.carriers!.includes(g.carrierCode)))) return false;
    if (q.refundableOnly && o.conditions.refundable !== true) return false;
    if (q.maxPrice && o.price.estimatedTotalCents > Math.round(q.maxPrice * 100)) return false;
    return true;
  });
}

export function sortOffers(offers: FlightOffer[], sort: FlightQuery["sort"]): FlightOffer[] {
  const arr = [...offers];
  const dur = (o: FlightOffer) => o.slices.reduce((a, s) => a + s.durationMinutes, 0);
  if (sort === "price") return arr.sort((a, b) => a.price.estimatedTotalCents - b.price.estimatedTotalCents);
  if (sort === "duration") return arr.sort((a, b) => dur(a) - dur(b));
  if (sort === "departure") return arr.sort((a, b) => a.slices[0].departLocal.localeCompare(b.slices[0].departLocal));
  if (!arr.length) return arr;
  // « Meilleur » : 65 % prix, 25 % durée, 10 % escales. Écarts RELATIFS au meilleur résultat (un vol 10 % plus cher
  // mais 5 fois plus court doit l'emporter) : le surcoût sature à +50 %, l'allongement à +100 %.
  const pMin = Math.max(1, Math.min(...arr.map((o) => o.price.estimatedTotalCents)));
  const dMin = Math.max(1, Math.min(...arr.map(dur)));
  const score = (o: FlightOffer) =>
    0.65 * Math.min(1, (o.price.estimatedTotalCents / pMin - 1) / 0.5) +
    0.25 * Math.min(1, dur(o) / dMin - 1) +
    0.1 * Math.min(1, o.slices.reduce((a, s) => a + s.stops, 0) / 4);
  return arr.sort((a, b) => score(a) - score(b));
}

export async function searchFlights(raw: unknown): Promise<FlightSearchResult> {
  const q = flightQuerySchema.parse(raw);
  const warnings: string[] = [];
  const slicesResolved = buildSlices(q);
  for (const s of slicesResolved) {
    if (!s.origin.length || !s.destination.length) throw new UserFacingError("Aéroport ou ville inconnu(e). Choisissez une suggestion de la liste.");
  }
  const today = todayIn();
  if (slicesResolved.some((s) => daysBetween(today, s.date) < 0)) throw new UserFacingError("La date de départ est déjà passée.");
  if (slicesResolved.some((s) => daysBetween(today, s.date) > 360)) warnings.push("Les compagnies publient rarement leurs tarifs plus de 11 mois à l'avance : la couverture peut être faible.");

  const combos = expandCombos(slicesResolved);
  const providers = flightProviders();
  const mode = flightDataMode();
  const fx = await getFxTable();

  const all: FlightOffer[] = [];
  const statusesAll: ProviderRunStatus[][] = [];
  let partial = false;
  await Promise.all(
    combos.map(async (slices) => {
      const params: FlightSearchParams = { slices, adults: q.adults, children: q.children, cabin: q.cabin as Cabin, maxStops: q.maxStops, currency: q.currency };
      const run = await runProviders(
        providers.map((p) => ({
          id: p.id,
          name: p.name,
          isDemo: p.isDemo,
          isConfigured: () => p.isConfigured() && (slices.length <= 2 || p.capabilities.multiCity),
          run: (signal: AbortSignal) => p.search(params, signal),
        })),
        JSON.stringify(params),
        Number(process.env.PROVIDER_TIMEOUT_MS ?? 12000),
      );
      all.push(...run.results);
      statusesAll.push(run.statuses);
      partial ||= run.partial;
    }),
  );

  // Fusion des statuts par fournisseur (sur toutes les combinaisons d'aéroports).
  const merged = new Map<string, ProviderRunStatus>();
  for (const st of statusesAll.flat()) {
    const prev = merged.get(st.id);
    if (!prev) merged.set(st.id, { ...st });
    else merged.set(st.id, { ...prev, count: prev.count + st.count, ms: Math.max(prev.ms, st.ms), status: prev.status === "ok" || st.status === "ok" ? "ok" : st.status, error: prev.error ?? st.error });
  }

  // Garde-fou : jamais de mélange démo / réel.
  const pure = all.filter((o) => (mode === "demo" ? o.source.isDemo : true));
  let offers = dedupeOffers(normalizeCurrency(pure, q.currency, fx));
  offers = applyNeeds(offers, q);
  void recordFlightObservations(offers, fx).catch(() => undefined);

  const totalBeforeFilters = offers.length;
  const carriersMap = new Map<string, { code: string; name: string; minCents: number }>();
  for (const o of offers)
    for (const s of o.slices)
      for (const g of s.segments) {
        const c = carriersMap.get(g.carrierCode);
        if (!c || o.price.estimatedTotalCents < c.minCents) carriersMap.set(g.carrierCode, { code: g.carrierCode, name: g.carrierName, minCents: o.price.estimatedTotalCents });
      }
  offers = sortOffers(filterOffers(offers, q), q.sort);

  if (q.checkedBag && offers.some((o) => o.baggage.checkedBags === null)) warnings.push("Certaines sources ne précisent pas les bagages : vérifiez les conditions chez le vendeur.");
  if (mode === "demo") warnings.unshift("Mode démonstration : tarifs et compagnies fictifs, générés pour tester l'application. Ajoutez une clé d'API pour des tarifs réels.");

  const nearby = q.trip !== "multicity"
    ? resolveAirports(q.origin!).slice(0, 1).flatMap((a) => nearbyAirports(a, 160)).filter((n) => n.airport.size === "L" || n.km < 120).slice(0, 4)
        .map((n) => ({ code: n.airport.iata, label: `${n.airport.city} (${n.airport.iata})`, km: Math.round(n.km) }))
    : [];

  return {
    mode,
    currency: q.currency,
    offers: offers.slice(0, 60),
    totalBeforeFilters,
    providers: [...merged.values()],
    partial,
    fx: { source: fx.source, date: fx.date },
    searched: { slices: combos[0] ?? [], airportsCombos: combos.length },
    carriers: [...carriersMap.values()].sort((a, b) => a.minCents - b.minCents),
    nearby,
    explanations: {
      sort:
        q.sort === "best"
          ? "« Meilleur choix » combine le coût total estimé (65 %), la durée (25 %) et le nombre d'escales (10 %). Aucun partenaire ne paie pour être mieux classé."
          : q.sort === "price"
            ? "Trié par coût total estimé (billet + frais connus correspondant à vos besoins)."
            : q.sort === "duration"
              ? "Trié par durée totale de trajet."
              : "Trié par heure de départ (heure locale).",
    },
    warnings,
  };
}


/** Calendrier des prix sur un mois (dates flexibles), selon les sources qui le permettent. */
export async function flightCalendar(origin: string, destination: string, month: string, currency: string) {
  const o = resolveAirports(origin)[0];
  const d = resolveAirports(destination)[0];
  if (!o || !d || !/^\d{4}-\d{2}$/.test(month)) throw new UserFacingError("Paramètres de calendrier invalides");
  const providers = flightProviders().filter((p) => p.capabilities.calendar && p.calendar);
  const fx = await getFxTable();
  const run = await runProviders(
    providers.map((p) => ({ id: p.id, name: p.name, isDemo: p.isDemo, isConfigured: () => p.isConfigured(), run: (s: AbortSignal) => p.calendar!(o, d, month, currency, s) })),
    `cal:${o}-${d}:${month}:${currency}`,
    8000,
  );
  const byDate = new Map<string, { date: string; totalCents: number; currency: string; sourceName: string; isDemo: boolean; foundAt?: string }>();
  for (const day of run.results) {
    const cents = convertCents(day.totalCents, day.currency, currency, fx);
    const prev = byDate.get(day.date);
    if (!prev || cents < prev.totalCents) byDate.set(day.date, { date: day.date, totalCents: cents, currency, sourceName: day.source.name, isDemo: day.source.isDemo, foundAt: day.foundAt });
  }
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    origin: o,
    destination: d,
    month,
    days,
    providers: run.statuses,
    available: providers.length > 0,
    note: providers.length
      ? "Prix d'un aller simple, classe économique, 1 adulte. Prix indicatifs à confirmer par une recherche."
      : "Aucune source configurée ne fournit de calendrier de prix (Duffel exigerait une recherche par jour, trop coûteuse).",
    nextMonth: addDays(`${month}-28`, 7).slice(0, 7),
  };
}
