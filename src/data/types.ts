export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Twelve<T> = [T, T, T, T, T, T, T, T, T, T, T, T];

export const TAGS = {
  plage: "Plage",
  culture: "Culture",
  gastronomie: "Gastronomie",
  nature: "Nature",
  randonnee: "Randonnée",
  fete: "Vie nocturne & fêtes",
  aurores: "Aurores boréales",
  romantique: "Romantique",
  ville: "City-break",
  aventure: "Aventure",
  iles: "Îles",
  histoire: "Histoire",
  desert: "Désert",
  famille: "Famille",
  hiver: "Hiver & neige",
} as const;
export type Tag = keyof typeof TAGS;

export type EventImpact = "prix" | "foule" | "fermetures" | "info";

export type DestinationEvent = {
  name: string;
  months: Month[];
  impact: EventImpact[];
  note?: string;
};

/**
 * Coûts journaliers indicatifs en EUR, gamme « milieu de gamme » :
 * [hébergement par chambre double et par nuit, repas par personne et par jour,
 *  transport local par personne et par jour, activités par personne et par jour].
 * Ordres de grandeur éditoriaux DINO : ce ne sont PAS des prix confirmés.
 */
export type DailyCosts = [lodging: number, food: number, transport: number, activities: number];

export type Destination = {
  slug: string;
  name: { fr: string; en: string };
  countryIso: string;
  lat: number;
  lon: number;
  timeZone: string;
  airports: string[];
  currency: string;
  tags: Tag[];
  summary: string;
  hiddenGem: boolean;
  climate: {
    /** Températures maximales moyennes (°C) par mois — valeurs indicatives arrondies. */
    tmax: Twelve<number>;
    tmin: Twelve<number>;
    /** Précipitations mensuelles moyennes (mm) — valeurs indicatives arrondies. */
    precip: Twelve<number>;
  };
  /** Affluence touristique relative estimée (1 = calme, 2 = moyenne, 3 = forte). Estimation éditoriale, pas un comptage. */
  crowd: Twelve<1 | 2 | 3>;
  /** Niveau de prix saisonnier relatif estimé (1 = moyenne annuelle). Estimation éditoriale. */
  priceIndex: Twelve<number>;
  costs: DailyCosts;
  events: DestinationEvent[];
  seasons: { rainy?: Month[]; hot?: Month[]; cold?: Month[]; aurora?: Month[]; notes?: string[] };
  traps: string[];
  gems: string[];
};
