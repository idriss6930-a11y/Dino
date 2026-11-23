/** Point d'entrée de la rédaction : Claude si une clé est configurée, sinon les règles. Dit toujours laquelle a servi. */
import { log } from "@/lib/log";
import { AiUnavailableError, aiConfigured, draftWithClaude, type Draft, type DraftPhoto } from "./claude";
import { fitTitle, normalizeHashtags, writeWithRules } from "./rules";
import type { ItemFacts, ListingText } from "./types";

export type Generated = {
  text: ListingText;
  writtenBy: "rules" | "claude";
  estimate: { lowCents: number; highCents: number } | null;
  estimateNote: string;
  cautions: string[];
  /** Message à montrer au vendeur quand l'IA n'a pas pu servir. */
  notice: string | null;
};

const toCents = (eur: number) => Math.max(0, Math.round(eur * 100));

/** Nettoie la réponse du modèle : limites de longueur, mots-clés normalisés, fourchette cohérente. */
export function fromDraft(d: Draft): Omit<Generated, "notice"> {
  const low = d.priceLowEur, high = d.priceHighEur;
  const estimate = low !== null && high !== null && high > 0 ? { lowCents: toCents(Math.min(low, high)), highCents: toCents(Math.max(low, high)) } : null;
  return {
    text: { title: fitTitle(d.title), description: d.description.trim().slice(0, 3000), hashtags: normalizeHashtags(d.hashtags) },
    writtenBy: "claude",
    estimate,
    estimateNote: d.priceNote.trim().slice(0, 400),
    cautions: d.cautions.map((c) => c.trim()).filter(Boolean).slice(0, 6),
  };
}

export async function generateListing(facts: ItemFacts, photos: DraftPhoto[], draft: typeof draftWithClaude = draftWithClaude): Promise<Generated> {
  const rules = (notice: string | null): Generated => ({ text: writeWithRules(facts), writtenBy: "rules", estimate: null, estimateNote: "", cautions: [], notice });
  if (!aiConfigured()) return rules(null);
  try {
    return { ...fromDraft(await draft(facts, photos)), notice: null };
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) throw e;
    log.warn("ai_unavailable", { reason: e.message });
    return rules(`${e.message} L'annonce a été rédigée par les règles automatiques à la place.`);
  }
}
