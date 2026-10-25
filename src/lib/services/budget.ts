/**
 * Calculateur de budget. Chaque ligne indique sa nature :
 *  - "confirmé"   : montant issu d'une offre réelle fournie par l'utilisateur ou une source live ;
 *  - "estimation" : ordre de grandeur DINO (coûts journaliers éditoriaux, modèle de prix de vol).
 * Un budget estimatif n'est jamais présenté comme un prix garanti.
 */
import { z } from "zod";
import { zBool } from "@/lib/utils/zod";
import { getDestination, MONTHS_FR } from "@/data/destinations";
import { convertCents, getFxTable } from "@/lib/providers/fx";
import { estimateRoundTripCents } from "./estimates";
import { resolveAirports } from "./airports";
import { UserFacingError } from "./flight-search";

export const budgetQuerySchema = z.object({
  destination: z.string().min(2),
  origin: z.string().min(3).default("PAR"),
  nights: z.coerce.number().int().min(1).max(60).default(7),
  travelers: z.coerce.number().int().min(1).max(10).default(2),
  rooms: z.coerce.number().int().min(1).max(5).optional(),
  month: z.coerce.number().int().min(1).max(12).default(new Date().getUTCMonth() + 1),
  currency: z.string().regex(/^[A-Z]{3}$/).default("EUR"),
  /** Prix de vol confirmé par personne (aller-retour), si l'utilisateur a choisi une offre réelle. */
  flightPerPerson: z.coerce.number().positive().optional(),
  checkedBags: z.coerce.number().int().min(0).max(4).default(0),
  insurance: zBool(true),
  cardFxFeePct: z.coerce.number().min(0).max(5).default(2),
  budget: z.coerce.number().positive().optional(),
});
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;

export type BudgetLine = { key: string; label: string; cents: number; nature: "confirmé" | "estimation"; detail: string };
export type Scenario = { id: "eco" | "value" | "comfort"; name: string; totalCents: number; perPersonCents: number; lines: BudgetLine[]; tradeoffs: string[]; fitsBudget: boolean | null };

const SCENARIOS = [
  { id: "eco" as const, name: "Séjour économique", lodging: 0.45, food: 0.55, transport: 0.6, activities: 0.4, flight: 1, bag: true,
    tradeoffs: ["Auberge, chambre simple ou logement excentré", "Repas au marché, street-food et cuisine", "Vol le moins cher, horaires et escales moins pratiques", "Activités surtout gratuites"] },
  { id: "value" as const, name: "Meilleur rapport qualité-prix", lodging: 1, food: 1, transport: 1, activities: 1, flight: 1.15, bag: true,
    tradeoffs: ["Hôtel ou appartement bien noté et bien situé", "Restaurants de quartier", "Vol avec bon compromis prix / durée", "Une ou deux visites payantes par jour"] },
  { id: "comfort" as const, name: "Séjour confort", lodging: 2.1, food: 1.9, transport: 2.2, activities: 2, flight: 1.6, bag: false,
    tradeoffs: ["Hôtel 4-5 étoiles central", "Bonnes tables", "Vol direct ou tarif flexible (bagage inclus)", "Visites guidées, taxis, excursions"] },
];

export async function computeBudget(raw: unknown) {
  const q = budgetQuerySchema.parse(raw);
  const dest = getDestination(q.destination);
  if (!dest) throw new UserFacingError("Destination inconnue");
  const fx = await getFxTable();
  const toCur = (eurCents: number) => convertCents(eurCents, "EUR", q.currency, fx);
  const originAirport = resolveAirports(q.origin)[0];
  const rooms = q.rooms ?? Math.ceil(q.travelers / 2);
  const season = dest.priceIndex[q.month - 1];
  const [lodging, food, transport, activities] = dest.costs;
  const flightEstimate = originAirport ? estimateRoundTripCents(originAirport, dest.airports[0], q.month) : null;
  const confirmedFlight = q.flightPerPerson ? Math.round(q.flightPerPerson * 100) : null;
  const foreignCurrency = dest.currency !== q.currency;

  const scenarios: Scenario[] = SCENARIOS.map((sc) => {
    const lines: BudgetLine[] = [];
    if (confirmedFlight) {
      lines.push({ key: "flight", label: "Billets d'avion", cents: confirmedFlight * q.travelers, nature: "confirmé", detail: `${q.travelers} × prix choisi (à revérifier au moment de réserver)` });
    } else if (flightEstimate) {
      lines.push({ key: "flight", label: "Billets d'avion (A/R)", cents: toCur(Math.round(flightEstimate * sc.flight)) * q.travelers, nature: "estimation", detail: `Modèle DINO : distance ${originAirport}→${dest.airports[0]} et saison (${MONTHS_FR[q.month - 1]})` });
    }
    if (q.checkedBags && sc.bag) lines.push({ key: "bags", label: "Bagages en soute", cents: toCur(4500 * 2) * q.checkedBags, nature: "estimation", detail: `${q.checkedBags} bagage(s) × 2 trajets × ~45 € (variable selon la compagnie)` });
    lines.push({ key: "lodging", label: "Hébergement", cents: toCur(Math.round(lodging * sc.lodging * season * 100)) * rooms * q.nights, nature: "estimation", detail: `${q.nights} nuits × ${rooms} chambre(s), saison ×${season}` });
    lines.push({ key: "citytax", label: "Taxes de séjour", cents: toCur(Math.round(sc.lodging * 150)) * q.travelers * q.nights, nature: "estimation", detail: "Ordre de grandeur, varie selon la ville et la catégorie" });
    lines.push({ key: "food", label: "Repas", cents: toCur(Math.round(food * sc.food * 100)) * q.travelers * q.nights, nature: "estimation", detail: `${q.travelers} pers. × ${q.nights} jours` });
    lines.push({ key: "transport", label: "Transports locaux", cents: toCur(Math.round(transport * sc.transport * 100)) * q.travelers * q.nights, nature: "estimation", detail: "Transports en commun, transferts aéroport, quelques taxis" });
    lines.push({ key: "activities", label: "Activités", cents: toCur(Math.round(activities * sc.activities * 100)) * q.travelers * q.nights, nature: "estimation", detail: "Musées, excursions, entrées" });
    const subtotal = lines.reduce((a, l) => a + l.cents, 0);
    if (foreignCurrency && q.cardFxFeePct > 0) {
      const onSite = lines.filter((l) => ["food", "transport", "activities", "citytax"].includes(l.key)).reduce((a, l) => a + l.cents, 0);
      lines.push({ key: "fx", label: `Frais de change (${dest.currency})`, cents: Math.round((onSite * q.cardFxFeePct) / 100), nature: "estimation", detail: `${q.cardFxFeePct} % des dépenses sur place (selon votre carte)` });
    }
    if (q.insurance) lines.push({ key: "insurance", label: "Assurance voyage", cents: Math.round(subtotal * 0.045), nature: "estimation", detail: "≈ 4,5 % du voyage (fourchette courante 3 à 6 %)" });
    const total = lines.reduce((a, l) => a + l.cents, 0);
    return {
      id: sc.id,
      name: sc.name,
      totalCents: total,
      perPersonCents: Math.round(total / q.travelers),
      lines,
      tradeoffs: sc.tradeoffs,
      fitsBudget: q.budget ? total <= Math.round(q.budget * 100) : null,
    };
  });

  // Comparaison sur 12 mois (scénario rapport qualité-prix).
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const f = originAirport ? estimateRoundTripCents(originAirport, dest.airports[0], m) : null;
    const s = dest.priceIndex[i];
    const total =
      (f ? toCur(Math.round(f * 1.15)) * q.travelers : 0) +
      toCur(Math.round(lodging * s * 100)) * rooms * q.nights +
      toCur(Math.round((food + transport + activities + 1.5) * 100)) * q.travelers * q.nights;
    return { month: m, name: MONTHS_FR[i], totalCents: total };
  });

  return {
    destination: { slug: dest.slug, name: dest.name.fr, currency: dest.currency },
    currency: q.currency,
    params: q,
    scenarios,
    byMonth,
    cheapestMonth: [...byMonth].sort((a, b) => a.totalCents - b.totalCents)[0],
    disclaimer:
      "Budget estimatif, non garanti : les coûts journaliers sont des ordres de grandeur éditoriaux DINO et le vol est estimé par un modèle (distance + saison) sauf si vous indiquez un prix confirmé.",
    fx: { source: fx.source, date: fx.date },
  };
}

/** Comparaison de plusieurs destinations pour les mêmes paramètres. */
export async function compareDestinationsBudget(slugs: string[], base: Omit<Partial<BudgetQuery>, "destination">) {
  const out = [];
  for (const slug of slugs.slice(0, 5)) {
    const b = await computeBudget({ ...base, destination: slug });
    out.push({ slug, name: b.destination.name, value: b.scenarios[1].totalCents, eco: b.scenarios[0].totalCents, comfort: b.scenarios[2].totalCents, currency: b.currency });
  }
  return out.sort((a, b) => a.value - b.value);
}
