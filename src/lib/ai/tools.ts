/**
 * Outils mis à disposition de l'assistant. Ils appellent les MÊMES services que l'interface :
 * l'IA ne répond jamais « de mémoire » sur les prix, elle interroge les sources du produit.
 * Chaque résultat est résumé (peu de jetons) et porte la nature de ses données.
 */
import { getDestination, MONTHS_FR } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";
import { searchFlights } from "@/lib/services/flight-search";
import { flightPriceInsight } from "@/lib/services/insight";
import { searchHotels } from "@/lib/services/hotel-search";
import { inspire } from "@/lib/services/inspiration";
import { computeBudget } from "@/lib/services/budget";
import { bestMonths, getClimate, scoreMonths } from "@/lib/services/seasons";
import { searchPlaces } from "@/lib/services/airports";
import { formatMoney } from "@/lib/utils/money";

export type ToolCard =
  | { type: "destinations"; items: { slug: string; name: string; country: string; month: string; perPerson: string; reasons: string[]; warnings: string[] }[]; note: string }
  | { type: "flights"; items: { summary: string; price: string; source: string; isDemo: boolean }[]; link: string; note: string }
  | { type: "hotels"; items: { name: string; price: string; perNight: string; rating: string; value: string; source: string; isDemo: boolean }[]; link: string; note: string }
  | { type: "insight"; verdict: string; recommendation: string; confidence: string; available: boolean; note: string; link: string }
  | { type: "season"; slug: string; name: string; best: { weather: string[]; price: string[]; crowd: string[] }; cheapQuiet: string; month?: { name: string; weather: number; price: number; crowd: number; pros: string[]; cons: string[] }; source: string }
  | { type: "budget"; slug: string; name: string; scenarios: { name: string; total: string; perPerson: string }[]; note: string };

export const TOOL_DEFINITIONS = [
  {
    name: "find_places",
    description: "Trouve le code IATA d'une ville ou d'un aéroport à partir de son nom (ex. « Lyon » → LYS). À utiliser avant une recherche de vol si le code n'est pas connu.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "suggest_destinations",
    description:
      "Propose des destinations du catalogue DINO compatibles avec un budget TOTAL estimé (vol estimé + séjour économique), une durée, un mois, des envies et une température. Les montants sont des ESTIMATIONS, pas des prix réels.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Code IATA ou ville (PAR, LYS…)" },
        budget: { type: "number", description: "Budget par personne dans la devise" },
        nights: { type: "integer" },
        month: { type: "integer", description: "1-12, ou 0 pour laisser DINO choisir le meilleur mois" },
        travelers: { type: "integer" },
        tags: { type: "array", items: { type: "string", enum: ["plage", "culture", "gastronomie", "nature", "randonnee", "fete", "aurores", "romantique", "ville", "aventure", "iles", "histoire", "desert", "famille", "hiver"] } },
        tempMin: { type: "number" },
        tempMax: { type: "number" },
        avoidCrowds: { type: "boolean" },
        hiddenGems: { type: "boolean" },
      },
      required: ["origin", "budget"],
    },
  },
  {
    name: "search_flights",
    description: "Recherche des vols auprès des fournisseurs configurés (ou des données de DÉMONSTRATION si aucun n'est configuré — le résultat l'indique). Dates au format AAAA-MM-JJ.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string" },
        destination: { type: "string" },
        departDate: { type: "string" },
        returnDate: { type: "string" },
        adults: { type: "integer" },
        cabin: { type: "string", enum: ["economy", "premium_economy", "business", "first"] },
        maxStops: { type: "integer" },
      },
      required: ["origin", "destination", "departDate"],
    },
  },
  {
    name: "flight_price_insight",
    description: "Évalue si le prix actuel d'un vol est intéressant par rapport à l'historique observé, avec recommandation (acheter / surveiller / comparer) et niveau de confiance. Peut répondre « données insuffisantes ».",
    input_schema: {
      type: "object" as const,
      properties: { origin: { type: "string" }, destination: { type: "string" }, departDate: { type: "string" }, returnDate: { type: "string" }, adults: { type: "integer" } },
      required: ["origin", "destination", "departDate"],
    },
  },
  {
    name: "search_hotels",
    description: "Compare les hébergements d'une destination du catalogue (slug, ex. « lisbonne ») pour des dates et une occupation données ; renvoie le rapport qualité-prix.",
    input_schema: {
      type: "object" as const,
      properties: { city: { type: "string" }, checkin: { type: "string" }, checkout: { type: "string" }, adults: { type: "integer" }, maxPerNight: { type: "number" } },
      required: ["city", "checkin", "checkout"],
    },
  },
  {
    name: "destination_seasons",
    description: "Calendrier d'une destination : meilleurs mois pour la météo, pour les prix et pour éviter la foule (notions distinctes), avec détail d'un mois si fourni. Indique la source climatique.",
    input_schema: { type: "object" as const, properties: { slug: { type: "string" }, month: { type: "integer" } }, required: ["slug"] },
  },
  {
    name: "estimate_budget",
    description: "Budget total estimé (vol, hébergement, repas, transports, activités, assurance, change) en 3 scénarios. ESTIMATIONS non garanties.",
    input_schema: {
      type: "object" as const,
      properties: { destination: { type: "string" }, origin: { type: "string" }, nights: { type: "integer" }, travelers: { type: "integer" }, month: { type: "integer" } },
      required: ["destination"],
    },
  },
];

type Json = Record<string, unknown>;
export type ToolOutput = { result: Json; card?: ToolCard };

export async function runTool(name: string, input: Json, currency = "EUR"): Promise<ToolOutput> {
  switch (name) {
    case "find_places":
      return { result: { places: searchPlaces(String(input.query ?? ""), 5) } };
    case "suggest_destinations": {
      const r = await inspire({ ...input, currency, limit: 6 });
      const items = r.results.map((x) => ({
        slug: x.destination.slug,
        name: x.destination.name.fr,
        country: x.countryName,
        month: x.monthName,
        perPerson: formatMoney(x.estimate.perPersonCents, currency),
        reasons: x.reasons,
        warnings: x.warnings,
      }));
      return {
        result: { nature: "estimations", nothingFits: r.nothingFits, origin: r.origin, items, disclaimer: r.disclaimer },
        card: { type: "destinations", items, note: r.disclaimer },
      };
    }
    case "search_flights": {
      const q = { trip: input.returnDate ? "roundtrip" : "oneway", currency, sort: "best", ...input };
      const r = await searchFlights(q);
      const items = r.offers.slice(0, 5).map((o) => ({
        summary: o.slices.map((s) => `${s.origin}→${s.destination} ${s.departLocal.replace("T", " ")} (${s.stops ? `${s.stops} escale(s)` : "direct"}, ${Math.round(s.durationMinutes / 6) / 10} h)`).join(" | ") + ` — ${o.validatingCarrier}`,
        price: formatMoney(o.price.estimatedTotalCents, o.price.currency),
        source: o.source.name,
        isDemo: o.source.isDemo,
      }));
      const qs = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]));
      return {
        result: { mode: r.mode, nature: r.mode === "demo" ? "données synthétiques de démonstration" : "prix fournis par les sources (à confirmer à la réservation)", offers: items, totalFound: r.totalBeforeFilters, providers: r.providers.map((p) => `${p.name}: ${p.status}`), warnings: r.warnings },
        card: { type: "flights", items, link: `/vols?${qs}`, note: r.warnings[0] ?? `Sources : ${r.providers.map((p) => p.name).join(", ")}` },
      };
    }
    case "flight_price_insight": {
      const q = { trip: input.returnDate ? "roundtrip" : "oneway", currency, ...input };
      const r = await flightPriceInsight(q);
      const qs = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]));
      return {
        result: {
          available: r.available,
          reason: r.reason,
          current: formatMoney(r.currentCents, r.currency),
          verdict: r.verdict,
          recommendation: r.recommendation,
          explanation: r.recommendationText,
          confidence: r.confidence,
          stats: r.stats ? { median: formatMoney(r.stats.medianCents, r.currency), min: formatMoney(r.stats.minCents, r.currency), observations: r.stats.n, days: r.stats.spanDays } : undefined,
          factors: r.factors.map((f) => `${f.kind} — ${f.label} : ${f.detail}`),
          historySource: r.historySource,
          isDemo: r.isDemo,
        },
        card: { type: "insight", verdict: r.verdict ?? "indisponible", recommendation: r.recommendationText, confidence: `${r.confidence.level} (${r.confidence.score}/100)`, available: r.available, note: r.historySource, link: `/vols?${qs}` },
      };
    }
    case "search_hotels": {
      const r = await searchHotels({ currency, sort: "value", ...input });
      const items = r.offers.slice(0, 5).map((o) => ({
        name: o.property.name,
        price: formatMoney(o.price.estimatedTotalCents, o.price.currency),
        perNight: formatMoney(o.price.perNightCents, o.price.currency),
        rating: o.property.rating ? `${o.property.rating.score}/${o.property.rating.scale} (${o.property.rating.count} avis, ${o.property.rating.sourceName})` : "pas de note",
        value: o.valueScore != null ? `${o.valueScore}/10 — ${o.valueExplanation}` : o.valueExplanation,
        source: o.source.name,
        isDemo: o.source.isDemo,
      }));
      return {
        result: { mode: r.mode, nights: r.nights, offers: items, explanation: r.explanation, warnings: r.warnings },
        card: { type: "hotels", items, link: `/hotels?city=${input.city}&checkin=${input.checkin}&checkout=${input.checkout}&adults=${input.adults ?? 2}`, note: r.warnings[0] ?? r.explanation },
      };
    }
    case "destination_seasons": {
      const d = getDestination(String(input.slug));
      if (!d) return { result: { error: "Destination inconnue du catalogue DINO" } };
      const climate = await getClimate(d);
      const scores = scoreMonths(d, climate.months);
      const best = bestMonths(scores);
      const m = input.month ? scores[Number(input.month) - 1] : undefined;
      const card: ToolCard = {
        type: "season",
        slug: d.slug,
        name: d.name.fr,
        best: { weather: best.weather.map((x) => x.name), price: best.price.map((x) => x.name), crowd: best.crowd.map((x) => x.name) },
        cheapQuiet: best.cheapAndQuietExplanation,
        month: m ? { name: m.name, weather: m.weather, price: m.price, crowd: m.crowd, pros: m.pros, cons: m.cons } : undefined,
        source: climate.source.label,
      };
      return {
        result: {
          destination: d.name.fr,
          country: COUNTRIES[d.countryIso]?.fr,
          climateSource: climate.source.label,
          crowdAndPriceNature: "estimations éditoriales relatives (pas des statistiques de fréquentation)",
          bestForWeather: card.best.weather,
          bestForPrice: card.best.price,
          bestForFewCrowds: card.best.crowd,
          cheapAndQuiet: best.cheapAndQuietExplanation,
          month: m ? { ...card.month, climate: m.climate, events: m.events, flags: m.flags } : undefined,
          events: d.events.map((e) => `${e.name} (${e.months.map((x) => MONTHS_FR[x - 1]).join(", ") || "date variable"})${e.note ? ` : ${e.note}` : ""}`),
          seasonalNotes: d.seasons.notes,
          traps: d.traps,
          gems: d.gems,
        },
        card,
      };
    }
    case "estimate_budget": {
      const r = await computeBudget({ currency, ...input });
      const scenarios = r.scenarios.map((s) => ({ name: s.name, total: formatMoney(s.totalCents, currency), perPerson: formatMoney(s.perPersonCents, currency) }));
      return {
        result: { nature: "estimations", destination: r.destination.name, scenarios: r.scenarios.map((s) => ({ ...s, lines: s.lines.map((l) => `${l.label}: ${formatMoney(l.cents, currency)} (${l.nature})`) })), cheapestMonth: r.cheapestMonth.name, disclaimer: r.disclaimer },
        card: { type: "budget", slug: r.destination.slug, name: r.destination.name, scenarios, note: r.disclaimer },
      };
    }
    default:
      return { result: { error: `Outil inconnu : ${name}` } };
  }
}
