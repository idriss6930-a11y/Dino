/**
 * Connexion base de données.
 * - DATABASE_URL=postgres://…  → PostgreSQL (production, plusieurs processus).
 * - sinon → PGlite (PostgreSQL embarqué en WebAssembly) dans ./.data/pglite : aucune installation requise.
 * - DATABASE_URL=memory://      → PGlite en mémoire (tests).
 * Les deux moteurs partagent exactement le même schéma et les mêmes migrations SQL.
 */
import path from "node:path";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

type Holder = { db?: DB; ready?: Promise<DB>; engine?: "postgres" | "pglite" };
const g = globalThis as unknown as { __dino_db?: Holder };
const holder: Holder = (g.__dino_db ??= {});

const MIGRATIONS = path.join(process.cwd(), "drizzle");

export function dbEngine(): "postgres" | "pglite" {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres") ? "postgres" : "pglite";
}

async function open(): Promise<DB> {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres")) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 10) });
    const db = drizzlePg(pool, { schema });
    if (process.env.DB_AUTO_MIGRATE !== "false") await migratePg(db, { migrationsFolder: MIGRATIONS });
    holder.engine = "postgres";
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = url === "memory://" ? undefined : (process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite"));
  if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  holder.engine = "pglite";
  // Les deux pilotes exposent la même API de requêtes Drizzle.
  return db as unknown as DB;
}

/** Retourne la base prête (migrations appliquées, référentiel chargé). */
export async function getDb(): Promise<DB> {
  if (holder.db) return holder.db;
  holder.ready ??= (async () => {
    const db = await open();
    const { ensureReferenceData } = await import("./seed-reference");
    await ensureReferenceData(db);
    holder.db = db;
    return db;
  })();
  return holder.ready;
}

/** Tests uniquement : repartir d'une base vierge. */
export function resetDbForTests() {
  holder.db = undefined;
  holder.ready = undefined;
}
