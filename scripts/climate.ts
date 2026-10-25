/** Récupère les normales ERA5 (Open-Meteo) pour les destinations. Usage : npm run climate:refresh -- [limite] [--force] */
import { refreshClimate } from "@/lib/services/climate-refresh";

const limit = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 60);
refreshClimate({ limit, force: process.argv.includes("--force") })
  .then((r) => {
    console.log(`✓ ${r.updated.length} destination(s) mises à jour, ${r.failed.length} échec(s), ${r.remaining} restante(s).`);
    if (r.failed.length) console.log("  Échecs :", r.failed.join(", "));
    process.exit(r.failed.length && !r.updated.length ? 1 : 0);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
