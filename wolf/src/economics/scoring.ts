/**
 * Grille de sélection produit sur 100 points (cahier des charges THE WOLF).
 * « competition » et « regulatory » sont notés à l'envers : plus de points = moins de concurrence / moins de risque.
 */
export const RUBRIC = {
  demand: { label: "Demande réelle", max: 20 },
  margin: { label: "Potentiel de marge", max: 20 },
  adPotential: { label: "Potentiel publicitaire", max: 15 },
  competition: { label: "Intensité concurrentielle (inversée)", max: 10 },
  differentiation: { label: "Différenciation", max: 10 },
  logistics: { label: "Facilité logistique", max: 10 },
  retention: { label: "Fidélisation", max: 5 },
  regulatory: { label: "Risques réglementaires et opérationnels (inversé)", max: 10 },
} as const;

export type Criterion = keyof typeof RUBRIC;

export interface Evidence {
  claim: string;
  source?: string;
  /** "sourcé" = chiffre lu dans une source citée ; "estimé" = calcul ou hypothèse à vérifier. */
  status: "sourcé" | "estimé" | "à vérifier";
}

export interface Opportunity {
  id: string;
  name: string;
  niche: string;
  scores: Record<Criterion, number>;
  evidence: Evidence[];
  /** Raison rédhibitoire (allégation trompeuse inévitable, risque santé…) : classée après les éligibles. */
  knockOut?: string;
  fitsNuitalys?: boolean;
  notes?: string;
}

export interface ScoredOpportunity extends Opportunity {
  total: number;
  eligible: boolean;
  rank: number;
}

export function scoreOpportunity(opportunity: Opportunity): Omit<ScoredOpportunity, "rank"> {
  let total = 0;
  for (const [criterion, { max }] of Object.entries(RUBRIC) as [Criterion, { max: number }][]) {
    const value = opportunity.scores[criterion];
    if (!Number.isFinite(value) || value < 0 || value > max) {
      throw new RangeError(`${opportunity.id}: ${criterion} doit être entre 0 et ${max} (reçu ${value})`);
    }
    total += value;
  }
  return { ...opportunity, total, eligible: !opportunity.knockOut };
}

export function rankOpportunities(opportunities: Opportunity[]): ScoredOpportunity[] {
  return opportunities
    .map(scoreOpportunity)
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.total - a.total ||
        b.scores.regulatory - a.scores.regulatory ||
        b.scores.margin - a.scores.margin,
    )
    .map((scored, index) => ({ ...scored, rank: index + 1 }));
}
