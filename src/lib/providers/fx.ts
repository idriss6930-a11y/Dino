/**
 * Taux de change. Source principale : Frankfurter (taux de référence de la BCE, gratuit, sans clé).
 * Repli : table intégrée de taux INDICATIFS, signalée comme telle dans l'interface.
 */
import { fetchJson } from "./http";

export type FxTable = { base: "EUR"; date: string; rates: Record<string, number>; source: "frankfurter" | "builtin" };

/** Taux indicatifs intégrés (1 EUR = x). Ordres de grandeur pour l'affichage hors-ligne uniquement. */
export const BUILTIN_RATES: FxTable = {
  base: "EUR",
  date: "2026-10-01",
  source: "builtin",
  rates: {
    EUR: 1, USD: 1.12, GBP: 0.85, CHF: 0.94, CAD: 1.55, AUD: 1.7, JPY: 165, KRW: 1550, CNY: 8.1, SGD: 1.48,
    THB: 38, IDR: 18500, VND: 29000, INR: 96, LKR: 340, AED: 4.1, OMR: 0.43, EGP: 55, MAD: 10.8, TND: 3.4,
    TRY: 45, CZK: 24.5, HUF: 395, PLN: 4.25, DKK: 7.46, NOK: 11.6, SEK: 11.2, ISK: 150, ALL: 98, GEL: 3.05,
    MXN: 21, BRL: 6.2, ARS: 1500, PEN: 4.2, ZAR: 20, TZS: 2900, XOF: 655.96,
  },
};

let cache: { table: FxTable; at: number } | null = null;
const TTL = 12 * 3600 * 1000;

export async function getFxTable(): Promise<FxTable> {
  if (cache && Date.now() - cache.at < TTL) return cache.table;
  if (process.env.FX_PROVIDER === "builtin" || process.env.NODE_ENV === "test") return BUILTIN_RATES;
  try {
    const data = await fetchJson<{ base: string; date: string; rates: Record<string, number> }>(
      "frankfurter",
      "https://api.frankfurter.dev/v1/latest?base=EUR",
      { timeoutMs: 4000 },
    );
    // Les devises non couvertes par la BCE gardent le taux indicatif intégré.
    const table: FxTable = { base: "EUR", date: data.date, rates: { ...BUILTIN_RATES.rates, ...data.rates, EUR: 1 }, source: "frankfurter" };
    cache = { table, at: Date.now() };
    return table;
  } catch {
    cache = { table: BUILTIN_RATES, at: Date.now() - TTL + 15 * 60 * 1000 }; // réessayer dans 15 min
    return BUILTIN_RATES;
  }
}

export function convertCents(cents: number, from: string, to: string, table: FxTable): number {
  if (from === to) return cents;
  const rf = table.rates[from];
  const rt = table.rates[to];
  if (!rf || !rt) throw new Error(`Devise non prise en charge : ${from} → ${to}`);
  return Math.round((cents / rf) * rt);
}

export function fxNote(from: string, to: string, table: FxTable): string | undefined {
  if (from === to) return undefined;
  const label = table.source === "frankfurter" ? `taux BCE du ${table.date}` : `taux indicatif intégré (${table.date})`;
  return `Converti de ${from} en ${to} au ${label}. Le montant final dépend du taux appliqué par votre banque.`;
}
