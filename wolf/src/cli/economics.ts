import { computeUnitEconomics, profitAtCpa } from "../economics/unitEconomics";
import { loadBusinessConfig, loadOffersConfig } from "../lib/config";
import { eur, num, pct, table } from "../lib/format";

const business = loadBusinessConfig();
const { offers, cpaScenarios } = loadOffersConfig();
const scenarios = Object.entries(cpaScenarios);

const rows = offers.map((offer) => {
  const ue = computeUnitEconomics(offer, business.params);
  return [
    offer.name,
    eur(offer.price),
    `${eur(offer.landedCost)} (${offer.costStatus})`,
    eur(ue.contributionBeforeAds),
    pct(ue.contributionRate),
    eur(ue.maxCpa),
    num(ue.breakEvenRoas),
    ...scenarios.map(([, s]) => eur(profitAtCpa(ue, s.cpa))),
  ];
});

console.log(`# Économie unitaire — ${business.params.vatRegime === "franchise" ? "franchise de TVA" : "TVA normale"}, charges sur CA ${pct(business.params.turnoverChargeRate)}\n`);
console.log(
  table(
    ["Offre", "Prix", "Coût débarqué", "Contribution avant pub", "Taux", "CPA max (HT régie)", "ROAS de rentabilité", ...scenarios.map(([name, s]) => `Profit/cmd CPA ${name} ${eur(s.cpa)}`)],
    rows,
  ),
);
console.log(`\nFrais fixes mensuels retenus : ${eur(business.fixedCostsMonthlyTotal)}. Coûts « estimé » = à remplacer par le prix réel DSers avant toute dépense.`);
