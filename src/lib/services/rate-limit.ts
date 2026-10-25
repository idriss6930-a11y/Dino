/** Limiteur à fenêtre glissante en mémoire (par instance). Utilisé contre les abus d'API et le spam. */
const g = globalThis as unknown as { __dino_rl?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__dino_rl ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 20000) hits.clear(); // garde-fou mémoire
  return { ok: true, retryAfterSec: 0 };
}

export function resetRateLimits() {
  hits.clear();
}
