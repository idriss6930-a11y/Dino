/** Montants en centimes entiers : toutes les additions se font en entiers pour éviter les erreurs d'arrondi. */
export type Money = { cents: number; currency: string };

export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => cents / 100;

/** Devises sans subdivision usuelle (affichage sans décimales). */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "IDR", "ISK", "CLP", "HUF", "TZS", "LKR"]);

export function formatMoney(cents: number, currency: string, locale = "fr-FR", opts: { compact?: boolean } = {}) {
  const amount = cents / 100;
  const noDecimals = opts.compact || ZERO_DECIMAL.has(currency) || Math.abs(amount) >= 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: noDecimals ? 0 : 2,
    minimumFractionDigits: noDecimals ? 0 : 2,
  }).format(amount);
}

export function sumCents(values: Array<number | null | undefined>) {
  return values.reduce<number>((a, b) => a + (b ?? 0), 0);
}

/** Parse une saisie utilisateur ("600", "600,50", "1 200 €") en centimes, ou null. */
export function parseAmountToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
