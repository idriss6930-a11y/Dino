import { api, searchParamsToObject } from "@/lib/api";
import { compareDestinationsBudget, computeBudget } from "@/lib/services/budget";

export const GET = api(async (req) => {
  const raw = searchParamsToObject(req.nextUrl.searchParams, ["compare"]);
  const compare = Array.isArray(raw.compare) ? (raw.compare as string[]) : [];
  delete raw.compare;
  const budget = await computeBudget(raw);
  const comparison = compare.length ? await compareDestinationsBudget([String(raw.destination), ...compare.filter((c) => c !== raw.destination)], raw) : null;
  return { ...budget, comparison };
}, { rate: { name: "budget", limit: 60, windowMs: 60_000 } });
