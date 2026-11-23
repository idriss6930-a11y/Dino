/** Montants en centimes entiers, en euros. */
export function formatEur(cents: number | null | undefined, opts: { sign?: boolean } = {}) {
  if (cents === null || cents === undefined) return "—";
  const s = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
  return opts.sign && cents > 0 ? `+${s}` : s;
}

/** Parse une saisie ("12", "12,50", "1 200 €") en centimes, ou null si vide ou invalide. */
export function parseEurToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d,.]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100);
}

export const centsToInput = (cents: number | null | undefined) => (cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ",").replace(/,00$/, ""));
