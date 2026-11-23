import type { Condition, PlatformId } from "./constants";

export type Audience = "femme" | "homme" | "enfant" | "mixte";

/** Ce que le vendeur sait de son article. */
export type ItemFacts = {
  kind: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  audience: Audience;
  condition: Condition;
  defects: string;
  notes: string;
};

/** Le texte de l'annonce, commun à toutes les plateformes. */
export type ListingText = { title: string; description: string; hashtags: string[] };

export const TITLE_MAX = 80; // limite d'eBay, la plus stricte : un titre de 80 caractères passe partout

export const CONDITION_LABELS: Record<Condition, string> = {
  new_tags: "Neuf avec étiquette",
  new: "Neuf sans étiquette",
  very_good: "Très bon état",
  good: "Bon état",
  fair: "État satisfaisant",
};

export type { Condition, PlatformId };
