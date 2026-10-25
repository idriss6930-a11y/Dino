import type { ProviderRunStatus } from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";
import { providerCache, SOURCE_TTL } from "./cache";
import { recordApiUsage } from "./usage";

type Runnable<T> = { id: string; name: string; isDemo: boolean; isConfigured(): boolean; run(signal: AbortSignal): Promise<T[]> };

/**
 * Interroge plusieurs fournisseurs en parallèle, chacun avec son délai d'attente.
 * Un fournisseur lent ou en erreur n'empêche jamais l'affichage des autres résultats : la réponse est alors
 * marquée « partielle » et le statut de chaque source est renvoyé à l'interface.
 */
export async function runProviders<T>(providers: Runnable<T>[], cacheKey: string, timeoutMs: number) {
  const statuses: ProviderRunStatus[] = [];
  const results: T[] = [];
  await Promise.all(
    providers.map(async (p) => {
      const started = Date.now();
      const checkedAt = new Date().toISOString();
      if (!p.isConfigured()) {
        statuses.push({ id: p.id, name: p.name, isDemo: p.isDemo, status: "not_configured", count: 0, ms: 0, checkedAt });
        return;
      }
      const key = `${p.id}:${cacheKey}`;
      const cached = providerCache.get<{ items: T[]; checkedAt: string }>(key);
      if (cached) {
        results.push(...cached.items);
        statuses.push({ id: p.id, name: p.name, isDemo: p.isDemo, status: cached.items.length ? "ok" : "empty", count: cached.items.length, ms: 0, checkedAt: cached.checkedAt });
        return;
      }
      const ctrl = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const items = await Promise.race([
          p.run(ctrl.signal),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              ctrl.abort();
              reject(new ProviderError(p.id, "délai dépassé", true));
            }, timeoutMs);
          }),
        ]);
        results.push(...items);
        providerCache.set(key, { items, checkedAt }, SOURCE_TTL[p.id] ?? 10 * 60_000);
        statuses.push({ id: p.id, name: p.name, isDemo: p.isDemo, status: items.length ? "ok" : "empty", count: items.length, ms: Date.now() - started, checkedAt });
        if (!p.isDemo) void recordApiUsage(p.id, false);
      } catch (e) {
        const timeout = e instanceof ProviderError && e.message === "délai dépassé";
        statuses.push({
          id: p.id,
          name: p.name,
          isDemo: p.isDemo,
          status: timeout ? "timeout" : "error",
          count: 0,
          ms: Date.now() - started,
          error: e instanceof ProviderError ? e.message : "erreur inattendue",
          checkedAt,
        });
        if (!p.isDemo) void recordApiUsage(p.id, true);
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  const partial = statuses.some((s) => s.status === "error" || s.status === "timeout");
  return { results, statuses, partial };
}
