/**
 * Rédaction par règles : utilisée quand aucune clé d'IA n'est configurée.
 * Elle ne fait que mettre en forme ce que le vendeur a saisi ; elle n'invente rien.
 */
import { CONDITION_LABELS, TITLE_MAX, type ItemFacts, type ListingText } from "./types";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function slugTag(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeHashtags(tags: string[], max = 8): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const slug = slugTag(t).slice(0, 30);
    if (slug.length >= 2 && !out.includes(slug)) out.push(slug);
    if (out.length >= max) break;
  }
  return out;
}

/** Tronque à la limite sans couper un mot en deux. */
export function fitTitle(title: string, max = TITLE_MAX) {
  const t = clean(title);
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return (at > max * 0.5 ? cut.slice(0, at) : t.slice(0, max)).replace(/[\s,;:–-]+$/, "");
}

export function writeWithRules(facts: ItemFacts): ListingText {
  const kind = clean(facts.kind);
  const brand = clean(facts.brand);
  const color = clean(facts.color).toLowerCase();
  const material = clean(facts.material).toLowerCase();
  const size = clean(facts.size);

  // Les mots les plus cherchés d'abord ; on n'ajoute un élément que s'il tient dans la limite.
  let title = "";
  for (const part of [cap(kind), brand, color, material && `en ${material}`, size && `taille ${size}`, facts.audience !== "mixte" && facts.audience]) {
    if (!part) continue;
    const next = title ? `${title} ${part}` : part;
    if (next.length <= TITLE_MAX) title = next;
  }

  const lines: string[] = [];
  const subject = [cap(kind) || "Article", brand, color].filter(Boolean).join(" ");
  lines.push(`${subject}${material ? ` en ${material}` : ""}.`);
  if (size) lines.push(`Taille : ${size}`);
  lines.push(`État : ${CONDITION_LABELS[facts.condition].toLowerCase()}${clean(facts.defects) ? `. À noter : ${clean(facts.defects)}` : ""}`);
  if (clean(facts.notes)) lines.push(clean(facts.notes));

  const hashtags = normalizeHashtags([kind, brand, color, material, facts.audience === "mixte" ? "" : facts.audience, "secondemain"]);
  return { title: fitTitle(title), description: lines.join("\n"), hashtags };
}
