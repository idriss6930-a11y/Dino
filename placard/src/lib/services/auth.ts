/**
 * Authentification : mots de passe hachés avec scrypt (sel unique), sessions opaques stockées sous forme de
 * hash SHA-256, limitation des tentatives par compte et par adresse IP, réinitialisation par jeton à usage
 * unique valable 1 h. Aucune réponse ne permet de savoir si une adresse e-mail possède un compte.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { newId, randomToken, sha256 } from "@/lib/utils/ids";
import { sendMail } from "./mailer";
import { AuthError, RateLimitError, UserFacingError } from "./errors";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
export const SESSION_DAYS = 30;
const MAX_FAILS_PER_ACCOUNT = 5;
const MAX_FAILS_PER_IP = 25;
const WINDOW_MS = 15 * 60 * 1000;

const COMMON = new Set(["motdepasse", "password", "azertyuiop", "1234567890", "0123456789", "qwertyuiop", "password123", "motdepasse1", "iloveyou12", "placardplacard"]);

export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(254);
export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum")
  .max(200)
  .refine((p) => !COMMON.has(p.toLowerCase()), "Mot de passe trop courant")
  .refine((p) => new Set(p).size >= 5, "Mot de passe trop répétitif");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("placard-dummy-password-for-timing"));

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2, "Nom trop court").max(40),
  acceptTerms: z.literal(true, { error: "Vous devez accepter les conditions d'utilisation" }),
});

export async function registerUser(raw: unknown) {
  const input = registerSchema.parse(raw);
  const db = await getDb();
  const exists = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, input.email)).limit(1);
  if (exists.length) throw new UserFacingError("Impossible de créer ce compte. Si vous avez déjà un compte, connectez-vous ou réinitialisez votre mot de passe.");
  const id = newId();
  await db.insert(s.users).values({ id, email: input.email, passwordHash: await hashPassword(input.password), displayName: input.displayName });
  return { id };
}

async function recentFailures(key: string) {
  const db = await getDb();
  const since = new Date(Date.now() - WINDOW_MS);
  const [row] = await db
    .select({ n: count() })
    .from(s.loginAttempts)
    .where(and(eq(s.loginAttempts.key, key), eq(s.loginAttempts.success, false), gt(s.loginAttempts.createdAt, since)));
  return row?.n ?? 0;
}

export async function authenticate(emailRaw: string, password: string, ip: string): Promise<{ userId: string }> {
  const email = emailSchema.safeParse(emailRaw);
  const accountKey = `acct:${sha256(email.success ? email.data : String(emailRaw))}`;
  const ipKey = `ip:${sha256(ip)}`;
  if ((await recentFailures(accountKey)) >= MAX_FAILS_PER_ACCOUNT || (await recentFailures(ipKey)) >= MAX_FAILS_PER_IP) {
    throw new RateLimitError(15 * 60, "Trop de tentatives. Réessayez dans 15 minutes ou réinitialisez votre mot de passe.");
  }
  const db = await getDb();
  const [user] = email.success ? await db.select().from(s.users).where(eq(s.users.email, email.data)).limit(1) : [];
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await getDummyHash()), false);
  await db.insert(s.loginAttempts).values([
    { id: newId(), key: accountKey, success: ok },
    { id: newId(), key: ipKey, success: ok },
  ]);
  if (!ok || !user) throw new AuthError("E-mail ou mot de passe incorrect");
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, user.id));
  return { userId: user.id };
}

export async function createSession(userId: string, userAgent = ""): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(s.sessions).values({ id: newId(), userId, tokenHash: sha256(token), userAgent: userAgent.slice(0, 200), expiresAt });
  return { token, expiresAt };
}

export type SessionUser = { id: string; email: string; displayName: string; plan: "free" | "premium" };

export async function getUserBySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const rows = await db
    .select({ u: s.users, expiresAt: s.sessions.expiresAt })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(eq(s.sessions.tokenHash, sha256(token)))
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt < new Date()) return null;
  const { u } = row;
  return { id: u.id, email: u.email, displayName: u.displayName, plan: u.plan };
}

export async function destroySession(token: string) {
  const db = await getDb();
  await db.delete(s.sessions).where(eq(s.sessions.tokenHash, sha256(token)));
}

/** Toujours la même réponse, que le compte existe ou non. */
export async function requestPasswordReset(emailRaw: string, baseUrl: string) {
  const email = emailSchema.safeParse(emailRaw);
  if (!email.success) return;
  const db = await getDb();
  const [user] = await db.select().from(s.users).where(eq(s.users.email, email.data)).limit(1);
  if (!user) return;
  const token = randomToken(32);
  await db.insert(s.passwordResets).values({ id: newId(), userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) });
  await sendMail(
    user.email,
    "Placard — réinitialisation de votre mot de passe",
    `Bonjour ${user.displayName},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${baseUrl}/reinitialiser?token=${token}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nPlacard`,
  );
  return token; // renvoyé uniquement pour les tests ; jamais exposé par l'API
}

export async function resetPassword(token: string, newPassword: string) {
  const pw = passwordSchema.parse(newPassword);
  const db = await getDb();
  const [row] = await db
    .select()
    .from(s.passwordResets)
    .where(and(eq(s.passwordResets.tokenHash, sha256(token)), isNull(s.passwordResets.usedAt), gt(s.passwordResets.expiresAt, new Date())))
    .limit(1);
  if (!row) throw new UserFacingError("Lien invalide ou expiré. Refaites une demande de réinitialisation.");
  await db.update(s.users).set({ passwordHash: await hashPassword(pw), updatedAt: new Date() }).where(eq(s.users.id, row.userId));
  await db.update(s.passwordResets).set({ usedAt: new Date() }).where(eq(s.passwordResets.id, row.id));
  await db.delete(s.sessions).where(eq(s.sessions.userId, row.userId)); // déconnecte tous les appareils
}

/** Suppression définitive du compte et de toutes les données associées (cascade). */
export async function deleteAccount(userId: string, password: string) {
  const db = await getDb();
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (!u || !(await verifyPassword(password, u.passwordHash))) throw new UserFacingError("Mot de passe incorrect");
  await db.delete(s.users).where(eq(s.users.id, userId));
}

/** Export des données personnelles (portabilité), sans secrets ni contenu binaire des photos. */
export async function exportUserData(userId: string) {
  const db = await getDb();
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (!u) throw new AuthError();
  const { passwordHash: _omit, ...user } = u;
  void _omit;
  return {
    exportedAt: new Date().toISOString(),
    user,
    items: await db.select().from(s.items).where(eq(s.items.userId, userId)),
    listings: await db.select().from(s.listings).where(eq(s.listings.userId, userId)),
    photos: await db.select({ id: s.photos.id, itemId: s.photos.itemId, mime: s.photos.mime, createdAt: s.photos.createdAt }).from(s.photos).where(eq(s.photos.userId, userId)),
    usage: await db.select().from(s.usage).where(eq(s.usage.userId, userId)),
    ebayConnected: (await db.select({ at: s.ebayAccounts.connectedAt }).from(s.ebayAccounts).where(eq(s.ebayAccounts.userId, userId))).length > 0,
  };
}
