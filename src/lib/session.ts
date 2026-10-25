import "server-only";
import { cookies, headers } from "next/headers";
import { createSession, destroySession, getUserBySessionToken, SESSION_DAYS, type SessionUser } from "@/lib/services/auth";
import { AuthError, ForbiddenError } from "@/lib/services/errors";

export const SESSION_COOKIE = "dino_session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return getUserBySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError();
  return u;
}

export async function requireModerator(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role === "user") throw new ForbiddenError();
  return u;
}

export async function startSession(userId: string) {
  const h = await headers();
  const { token, expiresAt } = await createSession(userId, h.get("user-agent") ?? "");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await destroySession(t);
  jar.delete(SESSION_COOKIE);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
