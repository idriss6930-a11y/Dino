import { readFileSync } from "node:fs";
import { rankOpportunities, type Opportunity } from "../economics/scoring";
import { projectPath } from "../lib/config";
import { table } from "../lib/format";

const data = JSON.parse(readFileSync(projectPath("data/opportunities.json"), "utf8")) as { opportunities: Opportunity[] };
const ranked = rankOpportunities(data.opportunities);
console.log(
  table(
    ["Rang", "Opportunité", "Niche", "Dem.", "Marge", "Pub", "Conc.", "Diff.", "Log.", "Fid.", "Régl.", "Total", "Statut"],
    ranked.map((o) => [
      o.rank,
      o.name,
      o.niche,
      o.scores.demand,
      o.scores.margin,
      o.scores.adPotential,
      o.scores.competition,
      o.scores.differentiation,
      o.scores.logistics,
      o.scores.retention,
      o.scores.regulatory,
      `**${o.total}**`,
      o.eligible ? (o.fitsNuitalys ? "éligible · marque Nuitalys" : "éligible · nouvelle boutique") : `écarté : ${o.knockOut}`,
    ]),
  ),
);
