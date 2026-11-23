/** Constantes partagées entre le serveur et le navigateur (aucune dépendance). */
export const PLATFORM_IDS = ["vinted", "ebay", "depop", "vestiaire"] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];
export const CONDITIONS = ["new_tags", "new", "very_good", "good", "fair"] as const;
export type Condition = (typeof CONDITIONS)[number];
export const AUDIENCES = ["mixte", "femme", "homme", "enfant"] as const;
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 1_500_000;
