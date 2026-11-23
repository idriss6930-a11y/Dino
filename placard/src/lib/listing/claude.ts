/**
 * Rédaction par Claude : regarde les photos, lit les faits saisis par le vendeur, renvoie une annonce structurée.
 * N'est appelée que si ANTHROPIC_API_KEY est configurée. Le modèle se règle avec PLACARD_AI_MODEL.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CONDITION_LABELS, type ItemFacts } from "./types";

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const aiModel = () => process.env.PLACARD_AI_MODEL || "claude-opus-5-5";

export const DraftSchema = z.object({
  title: z.string().describe("Titre de l'annonce, 80 caractères au plus"),
  description: z.string().describe("Description factuelle, en lignes courtes"),
  hashtags: z.array(z.string()).describe("5 à 8 mots-clés en minuscules, sans le signe #"),
  priceLowEur: z.number().nullable().describe("Bas de la fourchette de revente d'occasion estimée, en euros ; null si impossible à juger"),
  priceHighEur: z.number().nullable().describe("Haut de la fourchette estimée, en euros ; null si impossible à juger"),
  priceNote: z.string().describe("Une phrase : sur quoi repose l'estimation, ou pourquoi elle est impossible"),
  cautions: z.array(z.string()).describe("Points que le vendeur devrait vérifier avant de publier ; liste vide si aucun"),
});
export type Draft = z.infer<typeof DraftSchema>;

export const SYSTEM_PROMPT = `Tu rédiges des annonces de vêtements et d'objets de seconde main pour des particuliers qui vendent sur Vinted, eBay, Depop et Vestiaire Collective, en France. Le vendeur a l'article en main ; il t'envoie des photos et ce qu'il en sait. Ton texte sera collé tel quel dans l'annonce, puis lu par des acheteurs qui comparent des dizaines d'articles semblables.

Une bonne annonce se trouve et se croit. Le titre porte les mots que l'acheteur tape dans la recherche : type d'article, marque, ce qui le distingue (coupe, matière, motif, modèle), couleur, taille. La description dit en quelques lignes courtes ce qu'est l'article, sa taille, sa matière, son état, et tout défaut. Un défaut annoncé évite un litige ; un défaut caché en crée un. Reprends donc chaque défaut signalé par le vendeur, et ajoute ceux que tu vois nettement sur les photos.

Tu n'écris que ce qui est établi. La marque vient du vendeur ou d'une étiquette lisible sur une photo ; si ni l'un ni l'autre, tu ne cites pas de marque. Tu n'affirmes jamais qu'un article est authentique, tu n'inventes ni mesures, ni composition, ni année, ni promesse sur l'envoi. Si les photos contredisent ce que dit le vendeur (couleur, état, type d'article), garde sa version dans l'annonce et signale l'écart dans les points à vérifier.

Pour le prix, donne une fourchette de revente d'occasion en France à partir de ce que tu sais de la marque, du type d'article et de l'état. C'est une estimation de connaissance générale, pas un relevé d'annonces : dis-le dans la note, et réponds null si tu n'as pas de quoi juger (marque inconnue, article trop particulier).

Écris en français courant, sans majuscules d'emphase, sans émojis, sans formules vendeuses.`;

export type DraftPhoto = { mime: "image/jpeg" | "image/png" | "image/webp"; dataB64: string };

export function factsBlock(facts: ItemFacts): string {
  const rows: Array<[string, string]> = [
    ["Type d'article", facts.kind],
    ["Marque", facts.brand],
    ["Taille", facts.size],
    ["Couleur", facts.color],
    ["Matière", facts.material],
    ["Public", facts.audience === "mixte" ? "" : facts.audience],
    ["État", CONDITION_LABELS[facts.condition]],
    ["Défauts signalés", facts.defects],
    ["Autres précisions", facts.notes],
  ];
  const known = rows.filter(([, v]) => v.trim()).map(([k, v]) => `${k} : ${v.trim()}`);
  return `Ce que le vendeur indique :\n${known.join("\n") || "(rien de plus que les photos)"}`;
}

export class AiUnavailableError extends Error {}

export async function draftWithClaude(facts: ItemFacts, photos: DraftPhoto[], client: Anthropic = new Anthropic()): Promise<Draft> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...photos.slice(0, 4).map((p): Anthropic.Beta.BetaImageBlockParam => ({ type: "image", source: { type: "base64", media_type: p.mime, data: p.dataB64 } })),
    { type: "text", text: factsBlock(facts) },
  ];
  try {
    const response = await client.beta.messages.parse({
      model: aiModel(),
      max_tokens: 8000,
      // Un refus de sécurité est improbable ici, mais on laisse l'API basculer seule plutôt que d'échouer.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { effort: "low", format: zodOutputFormat(DraftSchema) },
    });
    if (response.stop_reason === "refusal") throw new AiUnavailableError("La rédaction automatique a été refusée pour cet article.");
    if (!response.parsed_output) throw new AiUnavailableError("La rédaction automatique a renvoyé une réponse incomplète.");
    return response.parsed_output;
  } catch (e) {
    if (e instanceof AiUnavailableError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiUnavailableError("La clé d'IA du service est invalide.");
    if (e instanceof Anthropic.RateLimitError) throw new AiUnavailableError("Le service d'IA est saturé pour le moment.");
    if (e instanceof Anthropic.BadRequestError) throw new AiUnavailableError("Le service d'IA a rejeté la demande.");
    if (e instanceof Anthropic.APIError) throw new AiUnavailableError("Le service d'IA est momentanément indisponible.");
    throw e;
  }
}
