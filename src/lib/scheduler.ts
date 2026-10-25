/**
 * Planificateur en processus : vérifie les alertes dues chaque minute et purge les données expirées chaque heure.
 * Une seule instance par processus (garde sur globalThis) ; un tour ne démarre pas tant que le précédent tourne.
 * La fréquence réelle de chaque alerte dépend de son intervalle (checkEveryMinutes), affiché à l'utilisateur.
 */
import { runDueAlerts } from "@/lib/services/alerts";
import { purgeExpired } from "@/lib/services/auth";
import { log } from "@/lib/log";

const g = globalThis as unknown as { __dino_scheduler?: { timers: NodeJS.Timeout[] } };

export function startScheduler(opts: { log?: boolean } = {}) {
  if (g.__dino_scheduler) return;
  let alertsBusy = false;
  const tickAlerts = async () => {
    if (alertsBusy) return;
    alertsBusy = true;
    try {
      const r = await runDueAlerts();
      if (opts.log || r.checked) log.info("alerts_tick", { checked: r.checked, notified: r.notified });
    } catch (e) {
      log.error("alerts_tick_failed", { error: e instanceof Error ? e.message : String(e) });
    } finally {
      alertsBusy = false;
    }
  };
  const tickPurge = async () => {
    try {
      await purgeExpired();
    } catch (e) {
      log.error("purge_failed", { error: e instanceof Error ? e.message : String(e) });
    }
  };
  const first = setTimeout(tickAlerts, 15_000);
  const timers = [first, setInterval(tickAlerts, 60_000), setInterval(tickPurge, 3_600_000)];
  for (const t of timers) t.unref?.();
  g.__dino_scheduler = { timers };
}

export function stopScheduler() {
  for (const t of g.__dino_scheduler?.timers ?? []) clearInterval(t);
  delete g.__dino_scheduler;
}
