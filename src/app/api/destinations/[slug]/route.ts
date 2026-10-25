import { api } from "@/lib/api";
import { getDestination } from "@/data/destinations";
import { COUNTRIES } from "@/data/countries";
import { NotFoundError } from "@/lib/services/errors";
import { bestMonths, getClimate, scoreMonths } from "@/lib/services/seasons";

/** Fiche d'une destination avec son calendrier sur 12 mois (application mobile). */
export const GET = api(async (_req, ctx: { params: Promise<{ slug: string }> }) => {
  const d = getDestination((await ctx.params).slug);
  if (!d) throw new NotFoundError("Destination introuvable");
  const { months, source } = await getClimate(d);
  const scores = scoreMonths(d, months);
  const best = bestMonths(scores);
  return {
    destination: { slug: d.slug, name: d.name.fr, country: COUNTRIES[d.countryIso]?.fr ?? d.countryIso, summary: d.summary, tags: d.tags, hiddenGem: d.hiddenGem, airports: d.airports },
    climateSource: source,
    months: scores.map((s) => ({ month: s.month, name: s.name, tmax: s.climate.tmax, tmin: s.climate.tmin, precip: s.climate.precip, weather: s.weather, price: s.price, crowd: s.crowd, overall: s.overall, pros: s.pros, cons: s.cons })),
    best: { overall: best.overall.map((m) => m.name), cheapAndQuiet: best.cheapAndQuiet.name, explanation: best.cheapAndQuietExplanation },
  };
});
