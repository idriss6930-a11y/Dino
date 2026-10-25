/**
 * Assistant conversationnel DINO.
 *
 * - Avec ANTHROPIC_API_KEY (côté serveur uniquement) : Claude orchestre les outils DINO (boucle manuelle
 *   d'appels d'outils), puis rédige une réponse structurée en quatre sections.
 * - Sans clé : un analyseur à règles transforme la demande en critères, appelle les mêmes outils et compose
 *   une réponse avec la même structure. Le mode utilisé est toujours indiqué.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getDestination, MONTHS_FR } from "@/data/destinations";
import { addDays, todayIn } from "@/lib/utils/dates";
import { log } from "@/lib/log";
import { parseQuery, regionCountries, type ParsedQuery } from "./parser";
import { runTool, TOOL_DEFINITIONS, type ToolCard } from "./tools";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Section = { title: "Faits vérifiés" | "Estimations" | "Prévisions" | "Recommandations"; items: string[] };
export type AssistantReply = {
  mode: "ia" | "regles";
  model?: string;
  text?: string;
  sections: Section[];
  cards: ToolCard[];
  toolsUsed: string[];
  parsed?: ParsedQuery;
  uncertainties: string[];
};

const SYSTEM = `Tu es DINO, un petit dinosaure explorateur, compagnon de voyage chaleureux, précis et honnête. Tu réponds en français, en tutoyant l'utilisateur.
Règles impératives :
- Pour tout prix, disponibilité, saison ou budget, utilise les outils fournis : n'invente jamais un tarif, une statistique ou un avis.
- Si un outil indique « démonstration », « estimation » ou « données insuffisantes », dis-le clairement.
- Ne promets jamais qu'un prix va baisser ; parle de probabilités et de niveau de confiance.
- Distingue la date à laquelle on réserve et les dates du voyage.
- Si la date du jour est nécessaire, aujourd'hui = {{TODAY}}. Choisis des dates futures cohérentes si l'utilisateur donne seulement un mois.
Format de la réponse finale, exactement ces quatre titres Markdown (omets une section vide) :
## Faits vérifiés
(données renvoyées par les outils, avec leur source)
## Estimations
(ordres de grandeur DINO, coûts estimés)
## Prévisions
(tendances probabilistes, avec niveau de confiance)
## Recommandations
(ton avis subjectif et argumenté, avec les compromis)
Termine par une ligne « Incertitudes : … » si pertinent. Reste concis (moins de 250 mots).`;

export function parseSections(text: string): Section[] {
  const titles: Section["title"][] = ["Faits vérifiés", "Estimations", "Prévisions", "Recommandations"];
  const out: Section[] = [];
  const parts = text.split(/^##\s+/m);
  for (const p of parts) {
    const [head, ...rest] = p.split("\n");
    const title = titles.find((t) => head.trim().toLowerCase().startsWith(t.toLowerCase()));
    if (!title) continue;
    const items = rest.join("\n").split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter((l) => l && !/^incertitudes\s*:/i.test(l));
    if (items.length) out.push({ title, items });
  }
  return out;
}

async function answerWithClaude(messages: ChatMessage[], currency: string): Promise<AssistantReply> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
  const effort = (process.env.ANTHROPIC_EFFORT ?? "low") as "low" | "medium" | "high";
  const convo: Anthropic.Beta.BetaMessageParam[] = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  const cards: ToolCard[] = [];
  const toolsUsed: string[] = [];
  const system = SYSTEM.replace("{{TODAY}}", todayIn());
  for (let turn = 0; turn < 6; turn++) {
    const params = {
      model,
      max_tokens: 4000,
      system,
      tools: TOOL_DEFINITIONS,
      tool_choice: { type: "auto" as const },
      messages: convo,
      output_config: { effort },
      // Repli côté serveur si un classifieur de sécurité refuse la requête.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    };
    const res = await client.beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (res.stop_reason === "refusal") {
      return { mode: "ia", model, sections: [], cards, toolsUsed, uncertainties: ["La demande n'a pas pu être traitée par le modèle. Reformule-la ou utilise les outils de recherche."] };
    }
    convo.push({ role: "assistant", content: res.content });
    const toolUses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !toolUses.length) {
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n");
      const unc = text.match(/Incertitudes\s*:\s*(.+)/i)?.[1];
      return { mode: "ia", model, text, sections: parseSections(text), cards, toolsUsed, uncertainties: unc ? [unc] : [] };
    }
    const results = await Promise.all(
      toolUses.map(async (tu) => {
        toolsUsed.push(tu.name);
        try {
          const out = await runTool(tu.name, tu.input as Record<string, unknown>, currency);
          if (out.card) cards.push(out.card);
          return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(out.result).slice(0, 12000) };
        } catch (e) {
          return { type: "tool_result" as const, tool_use_id: tu.id, content: `Erreur : ${e instanceof Error ? e.message : "inconnue"}`, is_error: true };
        }
      }),
    );
    convo.push({ role: "user", content: results });
  }
  return { mode: "ia", model, sections: [], cards, toolsUsed, uncertainties: ["Trop d'étapes nécessaires : précise ta demande."] };
}

/* --------------------------- Mode sans IA (règles) --------------------------- */

function nextMonthDate(month: number, day = 10): string {
  const today = todayIn();
  const y = Number(today.slice(0, 4));
  const cand = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return cand > addDays(today, 3) ? cand : `${y + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function answerWithRules(messages: ChatMessage[], currency: string, homeAirport?: string | null): Promise<AssistantReply> {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const p = parseQuery(last);
  const origin = p.origin ?? homeAirport ?? "PAR";
  const cards: ToolCard[] = [];
  const toolsUsed: string[] = [];
  const facts: string[] = [];
  const estimates: string[] = [];
  const forecasts: string[] = [];
  const recos: string[] = [];
  const uncertainties: string[] = [];
  if (!p.origin) uncertainties.push(`Aéroport de départ non précisé : j'ai supposé ${origin}.`);

  const use = async (name: string, input: Record<string, unknown>) => {
    toolsUsed.push(name);
    const out = await runTool(name, input, currency);
    if (out.card) cards.push(out.card);
    return out.result;
  };

  if (p.intent === "best_time" || (p.intent === "budget" && p.destinations[0])) {
    const slug = p.destinations[0];
    const d = getDestination(slug)!;
    const r = (await use("destination_seasons", { slug, month: p.month })) as { climateSource: string; bestForWeather: string[]; bestForPrice: string[]; bestForFewCrowds: string[]; cheapAndQuiet: string; month?: { name: string; weather: number; price: number; crowd: number; pros: string[]; cons: string[]; events: string[] }; traps: string[] };
    (r.climateSource.startsWith("Moyennes") ? facts : estimates).push(`Climat : ${r.climateSource}.`);
    if (r.month?.events?.length) estimates.push(`Calendrier éditorial DINO pour ${r.month.name} : ${r.month.events.join(", ")} (dates exactes à vérifier auprès des sources officielles).`);
    estimates.push(`Meilleurs mois météo : ${r.bestForWeather.join(", ")} ; prix les plus bas : ${r.bestForPrice.join(", ")} ; moins de foule : ${r.bestForFewCrowds.join(", ")} (estimations éditoriales).`);
    if (r.month) {
      estimates.push(`${r.month.name} à ${d.name.fr} : météo ${r.month.weather}/100, prix ${r.month.price}/100, tranquillité ${r.month.crowd}/100.`);
      if (r.month.pros.length) recos.push(`Points forts en ${r.month.name} : ${r.month.pros.join(", ")}.`);
      if (r.month.cons.length) recos.push(`Points faibles : ${r.month.cons.join(", ")}.`);
      const good = r.month.weather >= 60 && r.month.crowd >= 60;
      recos.push(good ? `Oui, ${r.month.name} est une bonne période pour ${d.name.fr}.` : `${r.month.name[0].toUpperCase() + r.month.name.slice(1)} n'est pas idéal : ${r.cheapAndQuiet}`);
    } else recos.push(r.cheapAndQuiet);
    if (p.intent === "budget") {
      const b = (await use("estimate_budget", { destination: slug, origin, nights: p.nights ?? 6, travelers: p.travelers ?? 1, month: p.month ?? new Date().getUTCMonth() + 1 })) as { scenarios: { name: string; totalCents: number }[] };
      estimates.push(`Budget estimé : ${b.scenarios.map((s) => `${s.name} ≈ ${Math.round(s.totalCents / 100)} ${currency}`).join(" ; ")}.`);
    }
    if (r.traps[0]) recos.push(`Piège à éviter : ${r.traps[0]}`);
  } else if (p.intent === "flight_insight" || p.intent === "flight_search") {
    const dest = getDestination(p.destinations[0] ?? "");
    if (!dest) {
      recos.push("Indique-moi l'itinéraire (départ, destination et date) pour que j'analyse le prix, ou ouvre la page du vol et utilise le bouton « Acheter maintenant ou attendre ? ».");
    } else {
      const departDate = p.departDate ?? nextMonthDate(p.month ?? ((new Date().getUTCMonth() + 2) % 12) + 1);
      const returnDate = p.returnDate ?? addDays(departDate, p.nights ?? 7);
      if (!p.departDate) uncertainties.push(`Dates non précisées : j'ai analysé un départ le ${departDate} et un retour le ${returnDate}.`);
      const r = (await use("flight_price_insight", { origin, destination: dest.airports[0], departDate, returnDate, adults: p.travelers ?? 1 })) as { available: boolean; reason?: string; current: string; verdict?: string; explanation: string; confidence: { level: string; score: number }; historySource: string; isDemo: boolean };
      facts.push(`Meilleur prix trouvé : ${r.current} (${r.historySource}).`);
      if (r.available) forecasts.push(`${r.verdict} — confiance ${r.confidence.level} (${r.confidence.score}/100).`);
      else forecasts.push(r.reason ?? "Prévision indisponible.");
      recos.push(r.explanation);
    }
  } else if (p.intent === "hotel_compare") {
    const dest = getDestination(p.destinations[0] ?? "");
    if (!dest) recos.push("Précise la ville et les dates : je comparerai les hébergements selon leur rapport qualité-prix (note pondérée par le nombre d'avis et prix total).");
    else {
      const checkin = p.departDate ?? nextMonthDate(p.month ?? ((new Date().getUTCMonth() + 2) % 12) + 1);
      const r = (await use("search_hotels", { city: dest.slug, checkin, checkout: addDays(checkin, p.nights ?? 3), adults: p.travelers ?? 2 })) as { offers: { name: string; price: string; value: string; source: string }[]; explanation: string; mode: string };
      for (const o of r.offers.slice(0, 3)) facts.push(`${o.name} : ${o.price} au total — ${o.source}.`);
      estimates.push(r.explanation);
      if (r.offers[0]) recos.push(`Meilleur rapport qualité-prix : ${r.offers[0].name} (${r.offers[0].value}).`);
    }
  } else {
    // Inspiration par défaut
    const region = regionCountries(p.region);
    const budget = p.budget ?? (p.cheap ? 500 : 1200);
    if (!p.budget) uncertainties.push(`Budget non précisé : j'ai pris ${budget} ${currency} par personne.`);
    const r = (await use("suggest_destinations", { origin, budget, nights: p.nights ?? 5, month: p.month ?? 0, travelers: p.travelers ?? 1, tags: p.tags, avoidCrowds: p.avoidCrowds, hiddenGems: p.hiddenGems })) as { items: { slug: string; name: string; country: string; month: string; perPerson: string; reasons: string[]; warnings: string[] }[]; nothingFits: boolean };
    let items = r.items;
    if (region) {
      items = items.filter((i) => region.includes(getDestination(i.slug)!.countryIso));
      const card = cards.find((c) => c.type === "destinations");
      if (card && card.type === "destinations") card.items = items.length ? items : card.items;
    }
    if (!items.length) items = r.items;
    if (r.nothingFits) facts.push("Aucune destination du catalogue n'entre entièrement dans ce budget selon nos estimations : voici les plus proches.");
    for (const i of items.slice(0, 3)) estimates.push(`${i.name} (${i.country}) en ${i.month} : environ ${i.perPerson} par personne, vol et séjour économique compris.`);
    if (items[0]) recos.push(`Mon coup de cœur : ${items[0].name} — ${items[0].reasons.slice(0, 2).join(" ; ")}.`);
    const warn = items.flatMap((i) => i.warnings.map((w) => `${i.name} : ${w}`)).slice(0, 2);
    if (warn.length) uncertainties.push(...warn);
    forecasts.push("Ces montants sont des estimations : lance une recherche de vols pour obtenir les prix réellement disponibles.");
  }

  if (p.month && !["best_time"].includes(p.intent)) facts.push(`Mois demandé : ${MONTHS_FR[p.month - 1]}.`);
  const sections: Section[] = [
    { title: "Faits vérifiés" as const, items: facts },
    { title: "Estimations" as const, items: estimates },
    { title: "Prévisions" as const, items: forecasts },
    { title: "Recommandations" as const, items: recos },
  ].filter((s) => s.items.length);
  if (!sections.length) sections.push({ title: "Recommandations", items: ["Je n'ai pas bien compris. Essaie par exemple : « 5 jours en avril au soleil avec 600 € depuis Lyon » ou « Est-ce une bonne idée de partir au Japon en août ? »."] });
  return { mode: "regles", sections, cards, toolsUsed, parsed: p, uncertainties };
}

export async function answer(messages: ChatMessage[], opts: { currency?: string; homeAirport?: string | null } = {}): Promise<AssistantReply> {
  const currency = opts.currency ?? "EUR";
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await answerWithClaude(messages, currency);
    } catch (e) {
      log.warn("assistant_llm_failed", { error: e instanceof Error ? e.message : String(e) });
      const r = await answerWithRules(messages, currency, opts.homeAirport);
      r.uncertainties.unshift("Le service d'IA est momentanément indisponible : réponse produite par l'analyse automatique de DINO.");
      return r;
    }
  }
  return answerWithRules(messages, currency, opts.homeAirport);
}
