import { eur, num } from "../lib/format";
import type { DailyReport } from "../pnl/report";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export interface DashboardOptions {
  shopName: string;
  generatedAt: Date;
}

/** Tableau de bord autonome (HTML + CSS + SVG en ligne, sans dépendance) à partir d'un rapport quotidien. */
export function renderDashboard(report: DailyReport, options: DashboardOptions): string {
  const spend = report.pnl.reduce((s, d) => s + d.adSpendInvoiced, 0);
  const cpa = report.totals.orders > 0 ? spend / report.totals.orders : Number.NaN;
  const roas = spend > 0 ? report.totals.revenue / spend : Number.NaN;
  const t = report.thresholds;

  const tile = (label: string, value: string, hint = "", state: "ok" | "bad" | "neutral" = "neutral") =>
    `<div class="tile ${state}"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><div class="hint">${escapeHtml(hint)}</div></div>`;

  const maxAbs = Math.max(1, ...report.pnl.map((d) => Math.abs(d.netProfit)));
  const barWidth = 100 / Math.max(1, report.pnl.length);
  const bars = report.pnl
    .map((d, i) => {
      const h = (Math.abs(d.netProfit) / maxAbs) * 45;
      const y = d.netProfit >= 0 ? 50 - h : 50;
      return `<rect x="${(i * barWidth + barWidth * 0.15).toFixed(2)}" y="${y.toFixed(2)}" width="${(barWidth * 0.7).toFixed(2)}" height="${Math.max(h, 0.5).toFixed(2)}" class="${d.netProfit >= 0 ? "pos" : "neg"}"><title>${escapeHtml(`${d.day} : ${eur(d.netProfit)}`)}</title></rect>`;
    })
    .join("");

  const rows = report.pnl
    .map((d) => `<tr><td>${d.day}</td><td>${d.orders}</td><td>${eur(d.revenue)}</td><td>${eur(d.landedCost)}</td><td>${eur(d.adCost)}</td><td>${eur(d.turnoverCharges + d.paymentFees + d.fixedCosts)}</td><td class="${d.netProfit >= 0 ? "pos" : "neg"}">${eur(d.netProfit)}</td></tr>`)
    .join("");

  const alerts =
    report.alerts.length === 0
      ? `<p class="muted">Aucune alerte.</p>`
      : `<ul class="alerts">${report.alerts.map((a) => `<li class="${a.severity}"><strong>${escapeHtml(a.code)}</strong> <span class="sev">${escapeHtml(a.severity)}</span><br>${escapeHtml(a.message)}</li>`).join("")}</ul>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pilotage ${escapeHtml(options.shopName)}</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--text:#1d1d1b;--muted:#6b6b66;--line:#e4e4df;--pos:#1f7a4d;--neg:#b42318;--warn:#b54708}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1f1f1d;--text:#ededea;--muted:#a3a39e;--line:#33332f;--pos:#4cc38a;--neg:#f97066;--warn:#fdb022}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1080px;margin:0 auto;padding:24px 16px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px}
.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:16px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}.label{color:var(--muted);font-size:13px}
.value{font-size:22px;font-weight:650;font-variant-numeric:tabular-nums}.hint{color:var(--muted);font-size:12px}
.tile.ok .value{color:var(--pos)}.tile.bad .value{color:var(--neg)}
svg{width:100%;height:160px;background:var(--card);border:1px solid var(--line);border-radius:10px}
rect.pos{fill:var(--pos)}rect.neg{fill:var(--neg)}line{stroke:var(--line)}
.table{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
th:first-child,td:first-child{text-align:left}td.pos{color:var(--pos)}td.neg{color:var(--neg)}
.alerts{list-style:none;padding:0;margin:0;display:grid;gap:8px}.alerts li{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--warn);border-radius:8px;padding:10px 12px}
.alerts li.critique{border-left-color:var(--neg)}.sev{color:var(--muted);font-size:12px;text-transform:uppercase}
</style></head><body><main>
<h1>${escapeHtml(options.shopName)} — tableau de bord</h1>
<p class="muted">Généré le ${escapeHtml(options.generatedAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))} · ${report.pnl.length} jour(s) · données Shopify${spend > 0 ? " et régies" : ""}, frais de paiement estimés.</p>
<div class="grid">
${tile("Bénéfice net", eur(report.totals.netProfit), "après pub, charges et fixes", report.totals.netProfit >= 0 ? "ok" : "bad")}
${tile("Commandes", String(report.totals.orders))}
${tile("CA TTC", eur(report.totals.revenue))}
${tile("Pub (TVA incluse)", eur(report.totals.adCost))}
${tile("CPA réel", Number.isNaN(cpa) ? "—" : eur(cpa), `max ${eur(t.maxCpa)}`, Number.isNaN(cpa) ? "neutral" : cpa <= t.maxCpa ? "ok" : "bad")}
${tile("ROAS réel", Number.isNaN(roas) ? "—" : num(roas), `seuil ${num(t.breakEvenRoas)}`, Number.isNaN(roas) ? "neutral" : roas >= t.breakEvenRoas ? "ok" : "bad")}
</div>
<h2>Bénéfice net par jour</h2>
<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Bénéfice net par jour"><line x1="0" y1="50" x2="100" y2="50"/>${bars}</svg>
<h2>Alertes</h2>
${alerts}
<h2>Détail</h2>
<div class="table"><table><thead><tr><th>Jour</th><th>Cmd</th><th>CA TTC</th><th>Coût produit</th><th>Pub</th><th>Frais et charges</th><th>Bénéfice net</th></tr></thead><tbody>${rows}</tbody></table></div>
${report.totals.missingCostOrders > 0 ? `<p class="muted">⚠️ ${report.totals.missingCostOrders} commande(s) sans coût unitaire : bénéfice surestimé.</p>` : ""}
</main></body></html>`;
}
