/**
 * Moteur d'alertes de prix.
 *
 * Cycle d'une vérification :
 *  1. l'alerte est « due » (dernière vérification + intervalle ≤ maintenant) ;
 *  2. on obtient le prix actuel auprès des fournisseurs (même logique que la recherche) ;
 *  3. on compare avec une référence COMPARABLE (même produit, même devise) ;
 *  4. si la condition est remplie, un événement est créé avec une empreinte unique (alert_id, fingerprint) :
 *     la même variation ne peut jamais déclencher deux notifications ;
 *  5. anti-spam : délai minimal entre deux notifications d'une même alerte et plafond quotidien par utilisateur.
 */
import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { getDestination } from "@/data/destinations";
import { flightDataMode, flightProviders, hotelDataMode, hotelProviders } from "@/lib/providers/registry";
import { addDays, isIsoDate, todayIn } from "@/lib/utils/dates";
import { newId } from "@/lib/utils/ids";
import { formatMoney } from "@/lib/utils/money";
import { searchFlights, flightCalendar } from "./flight-search";
import { searchHotels, nameSimilarity } from "./hotel-search";
import { inspire } from "./inspiration";
import { notify, notificationsSentToday } from "./notifications";
import { ForbiddenError, NotFoundError, UserFacingError } from "./errors";
import { log } from "@/lib/log";

export const PLAN_LIMITS = {
  free: { maxAlerts: 10, minIntervalMinutes: 360 },
  premium: { maxAlerts: 100, minIntervalMinutes: 60 },
} as const;

const NOTIFY_COOLDOWN_MS = 12 * 3600_000;

const criteriaSchema = z.object({
  origin: z.string().min(3).max(10).optional(),
  destination: z.string().min(2).max(40).optional(),
  departDate: z.string().refine(isIsoDate).optional(),
  returnDate: z.string().refine(isIsoDate).optional(),
  departMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  tripNights: z.coerce.number().int().min(1).max(60).optional(),
  passengers: z.coerce.number().int().min(1).max(9).default(1),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  citySlug: z.string().optional(),
  propertyName: z.string().max(120).optional(),
  checkin: z.string().refine(isIsoDate).optional(),
  checkout: z.string().refine(isIsoDate).optional(),
  maxStops: z.coerce.number().int().min(0).max(3).optional(),
  tags: z.array(z.string()).max(6).optional(),
  budget: z.coerce.number().positive().optional(),
  nights: z.coerce.number().int().min(1).max(60).optional(),
});

export const alertInputSchema = z
  .object({
    kind: z.enum(["route", "flexible", "hotel", "budget", "deal"]),
    name: z.string().trim().min(2).max(80).optional(),
    criteria: criteriaSchema,
    maxPrice: z.coerce.number().positive().max(100000).optional(),
    dropPct: z.coerce.number().int().min(5).max(80).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).default("EUR"),
    checkEveryMinutes: z.coerce.number().int().min(60).max(10080).default(360),
    channels: z.object({ inApp: z.boolean().default(true), email: z.boolean().default(false), push: z.boolean().default(false) }).default({ inApp: true, email: false, push: false }),
  })
  .superRefine((a, ctx) => {
    const c = a.criteria;
    const need = (cond: boolean, msg: string) => !cond && ctx.addIssue({ code: "custom", message: msg, path: ["criteria"] });
    if (a.kind === "route") need(!!(c.origin && c.destination && c.departDate), "Itinéraire et date de départ requis");
    if (a.kind === "flexible") need(!!(c.origin && c.destination && c.departMonth), "Itinéraire et mois de départ requis");
    if (a.kind === "hotel") need(!!(c.citySlug && c.checkin && c.checkout), "Ville et dates de séjour requises");
    if (a.kind === "budget") need(!!(c.origin && c.budget), "Aéroport de départ et budget requis");
    if (a.kind === "deal") need(!!c.origin, "Aéroport de départ requis");
    if (["route", "flexible", "hotel"].includes(a.kind) && !a.maxPrice && !a.dropPct)
      ctx.addIssue({ code: "custom", message: "Indiquez un prix maximal ou un pourcentage de baisse", path: ["maxPrice"] });
  });
export type AlertInput = z.infer<typeof alertInputSchema>;

function defaultName(a: AlertInput) {
  const c = a.criteria;
  if (a.kind === "route") return `${c.origin} → ${c.destination} le ${c.departDate}`;
  if (a.kind === "flexible") return `${c.origin} → ${c.destination} en ${c.departMonth}`;
  if (a.kind === "hotel") return `Hébergement à ${getDestination(c.citySlug!)?.name.fr ?? c.citySlug}`;
  if (a.kind === "budget") return `Destinations à moins de ${c.budget} ${a.currency} depuis ${c.origin}`;
  return `Bons plans exceptionnels depuis ${c.origin}`;
}

export function minIntervalFor(kind: AlertInput["kind"], plan: "free" | "premium") {
  const providers = kind === "hotel" ? hotelProviders() : flightProviders();
  const providerMin = Math.max(...providers.filter((p) => p.isConfigured()).map((p) => p.minCheckIntervalMinutes), 60);
  return Math.max(providerMin, PLAN_LIMITS[plan].minIntervalMinutes);
}

export async function createAlert(user: { id: string; plan: "free" | "premium" }, raw: unknown) {
  const a = alertInputSchema.parse(raw);
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.alerts).where(eq(s.alerts.userId, user.id));
  if (n >= PLAN_LIMITS[user.plan].maxAlerts) throw new UserFacingError(`Limite de ${PLAN_LIMITS[user.plan].maxAlerts} alertes atteinte pour votre formule.`);
  const interval = Math.max(a.checkEveryMinutes, minIntervalFor(a.kind, user.plan));
  const id = newId();
  await db.insert(s.alerts).values({
    id,
    userId: user.id,
    kind: a.kind,
    name: a.name ?? defaultName(a),
    criteria: a.criteria as s.AlertCriteria,
    maxPriceCents: a.maxPrice ? Math.round(a.maxPrice * 100) : null,
    dropPct: a.dropPct ?? null,
    currency: a.currency,
    checkEveryMinutes: interval,
    channels: a.channels,
  });
  return { id, checkEveryMinutes: interval, note: interval > a.checkEveryMinutes ? `Fréquence ajustée à ${Math.round(interval / 60)} h : limite de la source de données ou de votre formule.` : undefined };
}

async function ownedAlert(userId: string, alertId: string) {
  const db = await getDb();
  const [a] = await db.select().from(s.alerts).where(eq(s.alerts.id, alertId));
  if (!a) throw new NotFoundError("Alerte introuvable");
  if (a.userId !== userId) throw new ForbiddenError();
  return a;
}

export async function listAlerts(userId: string) {
  const db = await getDb();
  const alerts = await db.select().from(s.alerts).where(eq(s.alerts.userId, userId)).orderBy(desc(s.alerts.createdAt));
  const events = alerts.length
    ? await db.select().from(s.alertEvents).where(sql`${s.alertEvents.alertId} in ${alerts.map((a) => a.id)}`).orderBy(desc(s.alertEvents.createdAt))
    : [];
  return alerts.map((a) => ({ ...a, events: events.filter((e) => e.alertId === a.id).slice(0, 5) }));
}

export async function updateAlert(userId: string, alertId: string, patch: { active?: boolean; channels?: { inApp: boolean; email: boolean; push: boolean } }) {
  await ownedAlert(userId, alertId);
  const db = await getDb();
  await db.update(s.alerts).set({ ...(patch.active !== undefined ? { active: patch.active } : {}), ...(patch.channels ? { channels: patch.channels } : {}) }).where(eq(s.alerts.id, alertId));
}

export async function deleteAlert(userId: string, alertId: string) {
  await ownedAlert(userId, alertId);
  const db = await getDb();
  await db.delete(s.alerts).where(eq(s.alerts.id, alertId));
}

/* ------------------------------ Vérification ------------------------------ */

export type Observation = {
  priceCents: number;
  currency: string;
  comparableKey: string;
  label: string;
  link: string;
  isDemo: boolean;
  sourceName: string;
  snapshot: Record<string, unknown>;
};

async function observe(alert: typeof s.alerts.$inferSelect): Promise<Observation | Observation[] | null> {
  const c = alert.criteria;
  const currency = alert.currency;
  if (alert.kind === "route") {
    const q = {
      trip: c.returnDate ? "roundtrip" : "oneway",
      origin: c.origin,
      destination: c.destination,
      departDate: c.departDate,
      returnDate: c.returnDate,
      adults: c.passengers ?? 1,
      cabin: c.cabin ?? "economy",
      currency,
      maxStops: c.maxStops,
      sort: "price",
    };
    const r = await searchFlights(q);
    const best = r.offers[0];
    if (!best) return null;
    const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return {
      priceCents: best.price.ticketTotalCents,
      currency: best.price.currency,
      comparableKey: best.comparableKey,
      label: `${c.origin} → ${c.destination}, ${c.departDate}${c.returnDate ? ` – ${c.returnDate}` : ""}`,
      link: `/vols?${qs}`,
      isDemo: best.source.isDemo,
      sourceName: best.source.name,
      snapshot: { carrier: best.validatingCarrier, stops: best.slices.map((x) => x.stops), source: best.source.name, fetchedAt: best.fetchedAt },
    };
  }
  if (alert.kind === "flexible") {
    const cal = await flightCalendar(c.origin!, c.destination!, c.departMonth!, currency);
    const best = [...cal.days].sort((a, b) => a.totalCents - b.totalCents)[0];
    if (!best) return null;
    return {
      priceCents: best.totalCents,
      currency,
      comparableKey: `flex|${cal.origin}-${cal.destination}|${c.departMonth}|ow|economy`,
      label: `${cal.origin} → ${cal.destination}, meilleur prix de ${c.departMonth} (le ${best.date})`,
      link: `/vols?trip=oneway&origin=${cal.origin}&destination=${cal.destination}&departDate=${best.date}`,
      isDemo: best.isDemo,
      sourceName: best.sourceName,
      snapshot: { date: best.date, foundAt: best.foundAt },
    };
  }
  if (alert.kind === "hotel") {
    const r = await searchHotels({ city: c.citySlug, checkin: c.checkin, checkout: c.checkout, adults: c.passengers ?? 2, currency, sort: "price" });
    let pool = r.offers;
    if (c.propertyName) pool = pool.filter((o) => nameSimilarity(o.property.name, c.propertyName!) >= 0.6);
    else pool = pool.filter((o) => !o.property.rating || (o.property.rating.score / o.property.rating.scale) * 10 >= 7.5);
    const best = pool[0];
    if (!best) return null;
    return {
      priceCents: best.price.estimatedTotalCents,
      currency: best.price.currency,
      comparableKey: `${best.comparableKey}|${c.propertyName ? best.property.name : "zone>=7.5"}`,
      label: `${best.property.name}, ${r.destination.name} (${c.checkin} → ${c.checkout})`,
      link: `/hotels?city=${c.citySlug}&checkin=${c.checkin}&checkout=${c.checkout}&adults=${c.passengers ?? 2}`,
      isDemo: best.source.isDemo,
      sourceName: best.source.name,
      snapshot: { property: best.property.name, nights: best.nights, source: best.source.name },
    };
  }
  if (alert.kind === "budget" || alert.kind === "deal") {
    // Candidats : destinations compatibles (estimation), puis vérification d'un PRIX DE VOL observé par les sources.
    const month = c.departMonth ?? addDays(todayIn(), 45).slice(0, 7);
    const ideas = await inspire({ origin: c.origin, budget: c.budget ?? 5000, nights: c.nights ?? 5, month: Number(month.slice(5, 7)), tags: (c.tags ?? []).filter(Boolean), currency, limit: 6 });
    const out: Observation[] = [];
    for (const idea of ideas.results.slice(0, 6)) {
      const cal = await flightCalendar(c.origin!, idea.destination.airports[0], month, currency).catch(() => null);
      const best = cal?.days.length ? [...cal.days].sort((a, b) => a.totalCents - b.totalCents)[0] : null;
      if (!best) continue;
      const roundTrip = best.totalCents * 2;
      out.push({
        priceCents: alert.kind === "budget" ? roundTrip + idea.estimate.stayCents : best.totalCents,
        currency,
        comparableKey: `${alert.kind}|${cal!.origin}-${cal!.destination}|${month}`,
        label: `${idea.destination.name.fr} — vol dès ${formatMoney(best.totalCents, currency)} (aller simple observé le ${best.date})`,
        link: `/destinations/${idea.destination.slug}`,
        isDemo: best.isDemo,
        sourceName: best.sourceName,
        snapshot: { destination: idea.destination.slug, flightOneWayCents: best.totalCents, stayEstimateCents: idea.estimate.stayCents, date: best.date },
      });
    }
    return out;
  }
  return null;
}

export type Decision = { trigger: boolean; reason: string; changePct: number | null; reference: number | null };

/** Décision pure (testée) : faut-il notifier ? */
export function decide(opts: {
  current: number;
  reference: number | null;
  lastNotified: number | null;
  maxPriceCents: number | null;
  dropPct: number | null;
}): Decision {
  const ref = opts.lastNotified ?? opts.reference;
  const changePct = ref ? Math.round(((opts.current - ref) / ref) * 1000) / 10 : null;
  if (opts.maxPriceCents != null && opts.current <= opts.maxPriceCents) {
    // Sous le seuil : on ne renotifie que si le prix a encore baissé d'au moins 3 % depuis la dernière alerte.
    if (opts.lastNotified != null && opts.current > opts.lastNotified * 0.97) return { trigger: false, reason: "déjà notifié à ce niveau de prix", changePct, reference: ref };
    return { trigger: true, reason: "sous votre prix maximal", changePct, reference: ref };
  }
  if (opts.dropPct != null && ref != null && changePct != null && -changePct >= opts.dropPct) {
    return { trigger: true, reason: `baisse de ${Math.abs(changePct)} %`, changePct, reference: ref };
  }
  return { trigger: false, reason: "aucune condition remplie", changePct, reference: ref };
}

export function fingerprint(o: Pick<Observation, "comparableKey" | "priceCents" | "currency">) {
  return `${o.comparableKey}|${o.currency}|${o.priceCents}`;
}

export async function checkAlert(alertId: string, now = new Date()) {
  const db = await getDb();
  const [alert] = await db.select().from(s.alerts).where(eq(s.alerts.id, alertId));
  if (!alert || !alert.active) return { status: "skipped" as const };
  let obs: Observation[] = [];
  try {
    const r = await observe(alert);
    obs = r == null ? [] : Array.isArray(r) ? r : [r];
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : "erreur";
    await db.update(s.alerts).set({ lastCheckedAt: now, lastError: msg }).where(eq(s.alerts.id, alert.id));
    return { status: "error" as const, error: msg };
  }
  // Jamais de mélange : en mode démo, seules les données synthétiques sont prises en compte. En mode réel, les
  // fournisseurs synthétiques ne sont pas interrogés ; seules les offres « de test » d'une clé sandbox restent
  // possibles, et elles sont signalées comme telles dans la notification.
  const mode = alert.kind === "hotel" ? hotelDataMode() : flightDataMode();
  if (mode === "demo") obs = obs.filter((o) => o.isDemo);

  await db.update(s.alerts).set({ lastCheckedAt: now, lastError: obs.length ? null : "Aucune offre disponible lors de la dernière vérification" }).where(eq(s.alerts.id, alert.id));
  if (!obs.length) return { status: "no_data" as const };

  const triggered: string[] = [];
  for (const o of obs) {
    const [last] = await db
      .select()
      .from(s.alertEvents)
      .where(and(eq(s.alertEvents.alertId, alert.id), sql`${s.alertEvents.offer}->>'comparableKey' = ${o.comparableKey}`))
      .orderBy(desc(s.alertEvents.createdAt))
      .limit(1);
    const isPrimary = obs.length === 1;
    if (isPrimary && alert.referencePriceCents == null) {
      // Premier relevé : il devient la référence de comparaison (pas de notification de « baisse » sans historique).
      await db.update(s.alerts).set({ referencePriceCents: o.priceCents, lastPriceCents: o.priceCents }).where(eq(s.alerts.id, alert.id));
      if (alert.maxPriceCents == null || o.priceCents > alert.maxPriceCents) continue;
    }
    let decision: Decision;
    if (alert.kind === "budget") {
      decision = o.priceCents <= Math.round((alert.criteria.budget ?? 0) * 100)
        ? { trigger: !last || o.priceCents < last.priceCents * 0.97, reason: "compatible avec votre budget", changePct: null, reference: null }
        : { trigger: false, reason: "hors budget", changePct: null, reference: null };
    } else if (alert.kind === "deal") {
      // Bon plan = prix observé au moins 25 % sous la médiane des relevés comparables (≥ 7 relevés).
      const hist = await db.execute(sql`select percentile_cont(0.5) within group (order by price_cents) as med, count(*)::int as n from price_observations where market_key = ${o.comparableKey} and is_demo = ${o.isDemo}`);
      const row = (hist as unknown as { rows: { med: number | null; n: number }[] }).rows[0];
      await db.insert(s.priceObservations).values({ id: newId(), kind: "flight", routeKey: o.comparableKey, marketKey: o.comparableKey, travelDate: String(o.snapshot.date), observedAt: now, leadDays: 0, priceCents: o.priceCents, currency: o.currency, priceEurCents: o.priceCents, sourceId: o.isDemo ? "demo" : "travelpayouts", isDemo: o.isDemo });
      const ok = row && row.n >= 7 && row.med != null && o.priceCents <= row.med * 0.75;
      decision = ok ? { trigger: !last || o.priceCents < last.priceCents * 0.97, reason: `${Math.round((1 - o.priceCents / row.med!) * 100)} % sous le prix médian observé`, changePct: null, reference: row.med } : { trigger: false, reason: "pas exceptionnel", changePct: null, reference: null };
    } else {
      decision = decide({ current: o.priceCents, reference: alert.referencePriceCents ?? o.priceCents, lastNotified: last?.priceCents ?? null, maxPriceCents: alert.maxPriceCents, dropPct: alert.dropPct });
    }
    if (isPrimary) await db.update(s.alerts).set({ lastPriceCents: o.priceCents }).where(eq(s.alerts.id, alert.id));
    if (!decision.trigger) continue;
    if (alert.lastNotifiedAt && now.getTime() - alert.lastNotifiedAt.getTime() < NOTIFY_COOLDOWN_MS && !(last && o.priceCents < last.priceCents * 0.95)) continue;

    const [prefs] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, alert.userId));
    if ((await notificationsSentToday(alert.userId)) >= (prefs?.maxAlertNotificationsPerDay ?? 5)) {
      log.info("alert_daily_cap", { alertId: alert.id });
      break;
    }

    const eventId = newId();
    const inserted = await db
      .insert(s.alertEvents)
      .values({
        id: eventId,
        alertId: alert.id,
        fingerprint: fingerprint(o),
        priceCents: o.priceCents,
        previousPriceCents: decision.reference,
        changePct: decision.changePct,
        reason: decision.reason,
        offer: { ...o.snapshot, comparableKey: o.comparableKey, label: o.label, source: o.sourceName },
        isDemo: o.isDemo,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: s.alertEvents.id });
    if (!inserted.length) continue; // même variation déjà notifiée

    const demo = o.isDemo ? " (données de démonstration)" : "";
    const drop = decision.changePct != null && decision.changePct < 0 ? Math.abs(decision.changePct) : null;
    const title =
      alert.kind === "budget"
        ? `🦖 DINO a trouvé une destination dans ton budget${demo}`
        : alert.kind === "deal"
          ? `🦖 Bon plan repéré par DINO${demo}`
          : `🦖 DINO a trouvé une offre intéressante${demo}`;
    const body =
      drop != null
        ? `Le prix de ton itinéraire surveillé vient de baisser de ${drop} % : ${formatMoney(o.priceCents, o.currency)} (${o.label}). Consulte les dates, les conditions et le tarif actuel. Source : ${o.sourceName}.`
        : `${o.label} : ${formatMoney(o.priceCents, o.currency)} — ${decision.reason}. Consulte les dates, les conditions et le tarif actuel. Source : ${o.sourceName}.`;
    await notify({ userId: alert.userId, type: alert.kind === "budget" ? "budget_match" : alert.kind === "deal" ? "deal" : drop != null ? "price_drop" : "price_threshold", title, body, link: o.link, mascot: drop != null && drop >= 30 ? "surprised" : "happy", alertEventId: eventId, channels: alert.channels });
    await db.update(s.alerts).set({ lastNotifiedAt: now }).where(eq(s.alerts.id, alert.id));
    triggered.push(eventId);
  }
  return { status: triggered.length ? ("notified" as const) : ("checked" as const), events: triggered };
}

/** Exécute les alertes dues (appelé par le planificateur ou /api/cron/alerts). */
export async function runDueAlerts(limit = 50, now = new Date()) {
  const db = await getDb();
  const due = await db
    .select({ id: s.alerts.id })
    .from(s.alerts)
    .where(and(eq(s.alerts.active, true), or(isNull(s.alerts.lastCheckedAt), lte(sql`${s.alerts.lastCheckedAt} + (${s.alerts.checkEveryMinutes} * interval '1 minute')`, now))))
    .orderBy(asc(s.alerts.lastCheckedAt))
    .limit(limit);
  const results = [];
  for (const { id } of due) results.push({ id, ...(await checkAlert(id, now)) });
  return { checked: results.length, notified: results.filter((r) => r.status === "notified").length, results };
}
