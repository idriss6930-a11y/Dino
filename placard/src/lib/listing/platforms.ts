/**
 * Ce que chaque plateforme attend, et comment l'annonce commune s'y traduit.
 * Seul eBay est publié par API (officielle). Les trois autres n'autorisent pas la publication automatique :
 * Placard prépare les champs, le vendeur les colle lui-même.
 */
import { PLATFORM_IDS, type Condition, type PlatformId } from "./constants";
import { formatEur } from "@/lib/utils/money";
import { fitTitle } from "./rules";
import type { ItemFacts, ListingText } from "./types";

export type PlatformInfo = {
  id: PlatformId;
  label: string;
  /** Page de dépôt d'annonce (ou accueil vendeur) de la plateforme. */
  sellUrl: string;
  /** Barème vendeur ESTIMÉ, modifiable au moment de la vente : les grilles réelles varient et changent. */
  feePct: number;
  feeFixedCents: number;
  feeNote: string;
  conditions: Record<Condition, string>;
  hasTitle: boolean;
  descriptionMax?: number;
  hashtagMax: number;
};

export const PLATFORMS: Record<PlatformId, PlatformInfo> = {
  vinted: {
    id: "vinted",
    label: "Vinted",
    sellUrl: "https://www.vinted.fr/items/new",
    feePct: 0,
    feeFixedCents: 0,
    feeNote: "Estimation : pas de commission vendeur, les frais de protection sont payés par l'acheteur.",
    conditions: { new_tags: "Neuf avec étiquette", new: "Neuf sans étiquette", very_good: "Très bon état", good: "Bon état", fair: "Satisfaisant" },
    hasTitle: true,
    hashtagMax: 8,
  },
  ebay: {
    id: "ebay",
    label: "eBay",
    sellUrl: "https://www.ebay.fr/sl/sell",
    feePct: 8,
    feeFixedCents: 35,
    feeNote: "Estimation prudente : la commission dépend de votre statut (particulier ou professionnel) et de la catégorie.",
    conditions: { new_tags: "Neuf avec étiquettes", new: "Neuf sans étiquettes", very_good: "D'occasion", good: "D'occasion", fair: "D'occasion" },
    hasTitle: true,
    hashtagMax: 0,
  },
  depop: {
    id: "depop",
    label: "Depop",
    sellUrl: "https://www.depop.com/products/create/",
    feePct: 10,
    feeFixedCents: 0,
    feeNote: "Estimation prudente : la commission et les frais de paiement dépendent de votre pays.",
    conditions: { new_tags: "Brand new", new: "Like new", very_good: "Used – Excellent", good: "Used – Good", fair: "Used – Fair" },
    hasTitle: false,
    descriptionMax: 1000,
    hashtagMax: 5,
  },
  vestiaire: {
    id: "vestiaire",
    label: "Vestiaire Collective",
    sellUrl: "https://fr.vestiairecollective.com/",
    feePct: 13,
    feeFixedCents: 0,
    feeNote: "Estimation : commission de vente et frais de paiement cumulés ; un minimum s'applique sur les petits prix.",
    conditions: { new_tags: "Jamais porté, avec étiquette", new: "Jamais porté", very_good: "Très bon état", good: "Bon état", fair: "État correct" },
    hasTitle: false,
    hashtagMax: 0,
  },
};

export const isPlatformId = (v: string): v is PlatformId => (PLATFORM_IDS as readonly string[]).includes(v);

export type CopyField = { key: string; label: string; value: string; multiline?: boolean };
export type PlatformSheet = { platform: PlatformId; fields: CopyField[]; warnings: string[] };

/** Traduit l'annonce commune en champs prêts à coller pour une plateforme. */
export function sheetFor(platform: PlatformId, text: ListingText, facts: ItemFacts, priceCents: number | null): PlatformSheet {
  const p = PLATFORMS[platform];
  const warnings: string[] = [];
  const fields: CopyField[] = [];
  const tags = text.hashtags.slice(0, p.hashtagMax).map((t) => `#${t}`).join(" ");

  let description = text.description.trim();
  if (!p.hasTitle && platform === "depop" && text.title) description = `${text.title}\n\n${description}`;
  if (tags) description = `${description}\n\n${tags}`;
  if (p.descriptionMax && description.length > p.descriptionMax) {
    warnings.push(`Description raccourcie à ${p.descriptionMax} caractères (limite de ${p.label}).`);
    const room = p.descriptionMax - (tags ? tags.length + 2 : 0) - 1;
    const body = description.slice(0, tags ? description.length - tags.length - 2 : description.length).slice(0, room).trimEnd();
    description = `${body}…${tags ? `\n\n${tags}` : ""}`;
  }

  if (p.hasTitle) {
    const title = fitTitle(text.title);
    if (title !== text.title.trim()) warnings.push("Titre raccourci à 80 caractères.");
    fields.push({ key: "title", label: "Titre", value: title });
  }
  fields.push({ key: "description", label: "Description", value: description, multiline: true });
  if (facts.brand.trim()) fields.push({ key: "brand", label: "Marque", value: facts.brand.trim() });
  if (facts.size.trim()) fields.push({ key: "size", label: "Taille", value: facts.size.trim() });
  fields.push({ key: "condition", label: "État", value: p.conditions[facts.condition] });
  if (facts.color.trim()) fields.push({ key: "color", label: "Couleur", value: facts.color.trim() });
  if (facts.material.trim() && platform !== "depop") fields.push({ key: "material", label: "Matière", value: facts.material.trim() });
  if (priceCents !== null) fields.push({ key: "price", label: "Prix", value: formatEur(priceCents).replace(/\s?€/, "").trim() });
  else warnings.push("Aucun prix renseigné.");
  if (platform === "vestiaire") warnings.push("Vestiaire Collective contrôle l'authenticité : n'y déposez que des pièces de marque dont vous êtes sûr.");
  return { platform, fields, warnings };
}
