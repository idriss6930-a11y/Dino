/**
 * Planificateur autonome pour PostgreSQL (plusieurs processus possibles).
 * Avec PGlite, le planificateur tourne déjà dans le serveur Next (instrumentation.ts) : ne lancez pas ce script en parallèle.
 * Usage : npm run worker
 */
import { dbEngine } from "@/lib/db/client";
import { startScheduler } from "@/lib/scheduler";

if (dbEngine() === "pglite" && process.env.WORKER_FORCE !== "true") {
  console.error("PGlite n'accepte qu'un seul processus : le planificateur tourne déjà dans `npm run dev` / `npm start`.");
  console.error("Configurez DATABASE_URL=postgres://… pour utiliser un worker séparé.");
  process.exit(1);
}
startScheduler({ log: true });
console.log("🦖 Worker DINO démarré (alertes chaque minute, purge RGPD chaque heure). Ctrl+C pour arrêter.");
