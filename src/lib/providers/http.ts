import { ProviderError } from "./types";

/** Requête HTTP JSON avec délai d'attente, sans jamais journaliser les en-têtes (qui portent les clés). */
export async function fetchJson<T>(
  providerId: string,
  url: string,
  init: RequestInit & { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), init.timeoutMs ?? 8000);
  const onAbort = () => ctrl.abort(init.signal?.reason);
  init.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      // Message volontairement générique : on n'expose ni l'URL complète (paramètres, jetons) ni le corps brut.
      throw new ProviderError(providerId, `HTTP ${res.status}`, res.status >= 500 || res.status === 429);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    const aborted = ctrl.signal.aborted;
    throw new ProviderError(providerId, aborted ? "délai dépassé" : "erreur réseau", true);
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", onAbort);
  }
}
