/**
 * Analyse de requêtes en langage naturel SANS modèle d'IA (mode de repli et pré-analyse).
 * Transforme « Je veux partir cinq jours en avril, au soleil, avec 600 euros, au départ de Lyon »
 * en critères structurés. Volontairement prudent : ce qui n'est pas reconnu reste vide.
 */
import { DESTINATIONS, MONTHS_FR } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";
import type { Tag } from "@/data/types";
import { searchPlaces } from "@/lib/services/airports";

export type Intent = "inspiration" | "best_time" | "flight_insight" | "flight_search" | "hotel_compare" | "budget" | "unknown";

export type ParsedQuery = {
  intent: Intent;
  origin?: string;
  originLabel?: string;
  destinations: string[]; // slugs
  region?: string;
  month?: number;
  nights?: number;
  budget?: number;
  travelers?: number;
  tags: Tag[];
  avoidCrowds: boolean;
  hiddenGems: boolean;
  cheap: boolean;
  departDate?: string;
  returnDate?: string;
  recognized: string[];
};

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const NUMBERS: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20 };

const TAG_WORDS: [RegExp, Tag][] = [
  [/\b(soleil|plage|chaud|mer|baignade|bronzer)\b/, "plage"],
  [/aurore|boreale/, "aurores"],
  [/romanti|en amoureux|lune de miel/, "romantique"],
  [/randonn|trek|marche|montagne/, "randonnee"],
  [/culture|musee|histoire|patrimoine/, "culture"],
  [/gastronom|manger|cuisine|food/, "gastronomie"],
  [/fete|nocturne|soiree|festival/, "fete"],
  [/nature|paysage|parc national/, "nature"],
  [/aventure|sauvage/, "aventure"],
  [/\bile|iles\b/, "iles"],
  [/desert|dune/, "desert"],
  [/famille|enfants/, "famille"],
  [/neige|ski|hiver/, "hiver"],
];

const REGIONS: Record<string, string[]> = {
  asie: ["JP", "KR", "TH", "ID", "VN", "SG", "LK", "GE", "OM", "AE"],
  europe: ["PT", "ES", "IT", "GR", "CZ", "HU", "PL", "DE", "NL", "GB", "IE", "IS", "NO", "FI", "DK", "AL", "ME", "SI"],
  afrique: ["MA", "EG", "ZA", "TZ", "RE"],
  amerique: ["US", "CA", "MX", "BR", "AR", "PE"],
  "amerique du sud": ["BR", "AR", "PE"],
  "amerique latine": ["MX", "BR", "AR", "PE"],
  oceanie: ["AU"],
  "moyen-orient": ["AE", "OM", "EG"],
};

function parseNumber(token: string): number | undefined {
  if (/^\d+$/.test(token)) return Number(token);
  return NUMBERS[token];
}

export function parseQuery(text: string): ParsedQuery {
  const t = norm(text);
  const out: ParsedQuery = { intent: "unknown", destinations: [], tags: [], avoidCrowds: false, hiddenGems: false, cheap: false, recognized: [] };

  // Origine : « au départ de Lyon », « depuis Bordeaux », « de Paris à ... »
  const om = t.match(/(?:au depart de|depuis|en partant de|de)\s+([a-z\- ]{3,30}?)(?=[,.!?]| avec| pour| en | a | au | vers | et |$)/);
  if (om) {
    const sug = searchPlaces(om[1].trim(), 1)[0];
    if (sug) {
      out.origin = sug.code;
      out.originLabel = sug.label;
      out.recognized.push(`départ : ${sug.label}`);
    }
  }

  // Destinations (villes du catalogue, puis pays)
  for (const d of DESTINATIONS) {
    const names = [d.name.fr, d.name.en].map((n) => norm(n).split(/[ (&]/)[0]).filter((n) => n.length >= 4);
    if (names.some((n) => new RegExp(`\\b${n}`).test(t)) && !(out.originLabel && norm(out.originLabel).startsWith(names[0]))) out.destinations.push(d.slug);
  }
  for (const [iso, c] of Object.entries(COUNTRIES)) {
    const n = norm(c.fr);
    if (n.length >= 4 && new RegExp(`\\b(au |en |aux |a |l'|le |la )?${n}\\b`).test(t) && iso !== "FR") {
      for (const d of DESTINATIONS.filter((x) => x.countryIso === iso)) if (!out.destinations.includes(d.slug)) out.destinations.push(d.slug);
    }
  }
  if (out.destinations.length) out.recognized.push(`destination(s) : ${out.destinations.join(", ")}`);
  for (const r of Object.keys(REGIONS).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${r}\\b`).test(t)) {
      out.region = r;
      out.recognized.push(`région : ${r}`);
      break;
    }
  }

  // Mois
  MONTHS_FR.forEach((m, i) => {
    if (new RegExp(`\\b${norm(m)}\\b`).test(t)) out.month = i + 1;
  });
  if (out.month) out.recognized.push(`mois : ${MONTHS_FR[out.month - 1]}`);

  // Durée
  const dm = t.match(/\b(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt)\s+(jours?|nuits?|semaines?)\b/);
  if (dm) {
    const n = parseNumber(dm[1]) ?? 0;
    out.nights = dm[2].startsWith("semaine") ? n * 7 : dm[2].startsWith("jour") ? Math.max(1, n - 1) : n;
    out.recognized.push(`durée : ${out.nights} nuits`);
  } else if (/\bweek-?end\b/.test(t)) {
    out.nights = 2;
    out.recognized.push("durée : week-end (2 nuits)");
  }

  // Budget
  const bm = t.match(/(\d[\d\s.]*)\s*(?:€|euros?|eur\b)/) ?? t.match(/budget\s+(?:de\s+|max(?:imum)?\s+)?(\d[\d\s.]*)/);
  if (bm) {
    out.budget = Number(bm[1].replace(/[\s.]/g, ""));
    out.recognized.push(`budget : ${out.budget} €`);
  }

  // Voyageurs
  const pm = t.match(/\b(\d+|deux|trois|quatre|cinq|six)\s+(personnes|adultes|voyageurs)\b/);
  if (pm) out.travelers = parseNumber(pm[1]);
  else if (/\ba deux\b|en couple|en amoureux/.test(t)) out.travelers = 2;
  if (out.travelers) out.recognized.push(`voyageurs : ${out.travelers}`);

  for (const [re, tag] of TAG_WORDS) if (re.test(t) && !out.tags.includes(tag)) out.tags.push(tag);
  if (out.tags.length) out.recognized.push(`envies : ${out.tags.join(", ")}`);
  out.avoidCrowds = /peu frequent|sans (la )?foule|eviter (la )?foule|moins de touristes|tranquille|calme/.test(t);
  out.hiddenGems = /meconnu|secret|hors des sentiers|peu connu|insolite/.test(t);
  out.cheap = /pas cher|petit budget|economique|bon marche|sans exploser|moins cher/.test(t);

  const dates = [...t.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map((m) => m[1]);
  if (dates[0]) out.departDate = dates[0];
  if (dates[1]) out.returnDate = dates[1];

  // Intention
  if (/compare.*hotel|hotel.*vaut|quel hotel|ces (trois|3|deux|2) hotels/.test(t)) out.intent = "hotel_compare";
  else if (/(ce vol|ce billet|ce prix).*(interessant|bon|vaut)|acheter (maintenant|aujourd'hui)|attendre|bon moment pour (acheter|reserver)/.test(t)) out.intent = "flight_insight";
  else if (/bonne idee|meilleur(e)? (moment|periode|mois)|quand (partir|aller)|quel mois/.test(t) && out.destinations.length) out.intent = "best_time";
  else if (/budget total|combien (coute|couterait)|cout (total|reel)/.test(t) && out.destinations.length) out.intent = "budget";
  else if (out.destinations.length === 1 && out.origin && out.departDate) out.intent = "flight_search";
  else if (out.budget || out.tags.length || out.region || out.cheap || out.month || out.avoidCrowds || out.hiddenGems || /ou partir|voyage|destination/.test(t)) out.intent = "inspiration";
  return out;
}

export function regionCountries(region?: string): string[] | undefined {
  return region ? REGIONS[region] : undefined;
}
