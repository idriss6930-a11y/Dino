/**
 * Cache mémoire à durée de vie (TTL) avec limite de taille (éviction LRU simple).
 * Les durées respectent la validité annoncée par chaque source (ex. offres Duffel ~20-30 min).
 * Pour un déploiement multi-instances, remplacer par Redis ou la table cache_entries (même interface).
 */
type Entry = { value: unknown; expires: number };

export class TtlCache {
  private map = new Map<string, Entry>();
  constructor(private readonly max = 500) {}

  get<T>(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, e);
    return e.value as T;
  }

  set(key: string, value: unknown, ttlMs: number) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value as string);
    this.map.set(key, { value, expires: Date.now() + ttlMs });
  }

  clear() {
    this.map.clear();
  }
}

const g = globalThis as unknown as { __dino_cache?: TtlCache };
export const providerCache = (g.__dino_cache ??= new TtlCache(800));

/** TTL par source (ms). */
export const SOURCE_TTL: Record<string, number> = {
  demo: 10 * 60_000,
  "demo-b": 10 * 60_000,
  duffel: 15 * 60_000,
  travelpayouts: 2 * 3600_000,
  liteapi: 15 * 60_000,
};
