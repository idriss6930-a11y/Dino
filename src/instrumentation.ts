/**
 * Démarrage du serveur Next : lance le planificateur en processus.
 * DINO_SCHEDULER=off le désactive (par exemple avec PostgreSQL et un worker séparé : npm run worker).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DINO_SCHEDULER === "off") return;
  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
