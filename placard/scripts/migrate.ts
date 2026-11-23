/** Applique les migrations SQL (idempotent). Usage : npm run db:migrate */
import { dbEngine, getDb } from "@/lib/db/client";

getDb()
  .then(() => {
    console.log(`✓ Base prête (${dbEngine()}) : migrations appliquées.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Échec de la migration :", e instanceof Error ? e.message : e);
    process.exit(1);
  });
