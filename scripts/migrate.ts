/** Applique les migrations SQL et charge le référentiel (idempotent). Usage : npm run db:migrate */
import { dbEngine, getDb } from "@/lib/db/client";

async function main() {
  await getDb();
  console.log(`✓ Base prête (${dbEngine()}) : migrations appliquées, référentiel chargé.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Échec de la migration :", e instanceof Error ? e.message : e);
  process.exit(1);
});
