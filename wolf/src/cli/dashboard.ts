import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderDashboard } from "../dashboard/render";
import { projectPath } from "../lib/config";
import type { DailyReport } from "../pnl/report";

const latest = readdirSync(projectPath("out")).filter((f) => /^report-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
if (!latest) throw new Error("Aucun rapport dans out/ : lancer d'abord npm run report");
const report = JSON.parse(readFileSync(projectPath("out", latest), "utf8")) as DailyReport;
writeFileSync(projectPath("out/dashboard.html"), renderDashboard(report, { shopName: process.env.WOLF_SHOP_NAME ?? "Nuitalys", generatedAt: new Date() }));
console.log(`Tableau de bord écrit dans out/dashboard.html (source : ${latest})`);
