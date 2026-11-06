import { simulateCampaign } from "../economics/simulate";
import { computeUnitEconomics } from "../economics/unitEconomics";
import { loadBusinessConfig, loadOffersConfig } from "../lib/config";
import { argValue, eur, num, table } from "../lib/format";

const business = loadBusinessConfig();
const { offers, cpaScenarios } = loadOffersConfig();
const offerId = argValue("offer", offers[0]?.id)!;
const offer = offers.find((o) => o.id === offerId);
if (!offer) throw new Error(`Offre inconnue : ${offerId}`);
const days = Number(argValue("days", "21"));
const dailyAdSpend = Number(argValue("budget", "20"));
const payoutDelayDays = Number(argValue("payout", "3"));
const oneOffCosts = Number(argValue("oneoff", "150"));
const ue = computeUnitEconomics(offer, business.params);

const rows = Object.entries(cpaScenarios).map(([name, scenario]) => {
  const r = simulateCampaign({ offer, unitEconomics: ue, days, dailyAdSpend, cpa: scenario.cpa, fixedCostsMonthly: business.fixedCostsMonthlyTotal, oneOffCosts, payoutDelayDays });
  return [name, eur(scenario.cpa), num(r.orders, 1), eur(r.revenueKept), eur(r.adSpendCost), eur(r.netProfit), eur(r.peakCashNeed)];
});

console.log(`# Test de ${days} jours — ${offer.name}, ${eur(dailyAdSpend)}/jour facturés, versements Shopify à J+${payoutDelayDays}, frais de départ ${eur(oneOffCosts)}\n`);
console.log(table(["Scénario", "CPA", "Commandes", "CA conservé", "Coût pub (TVA incluse)", "Résultat net", "Trésorerie nécessaire"], rows));
