export const eur = (n: number) =>
  Number.isFinite(n) ? `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "∞";
export const pct = (n: number) => `${(n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
export const num = (n: number, digits = 2) => (Number.isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: digits }) : "∞");

export function table(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => `| ${cells.join(" | ")} |`;
  return [line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n");
}

export function argValue(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}
