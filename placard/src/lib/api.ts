/**
 * Enveloppe commune des routes API : contrôle d'origine (CSRF) sur les requêtes qui modifient des données,
 * limitation de débit, et conversion des erreurs en réponses JSON sans détail interne.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { log } from "@/lib/log";
import { AuthError, ForbiddenError, NotFoundError, RateLimitError, UserFacingError } from "@/lib/services/errors";
import { rateLimit } from "@/lib/services/rate-limit";
import { newId } from "@/lib/utils/ids";

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response | unknown>;

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const allowed = (process.env.APP_URL ? [new URL(process.env.APP_URL).host] : []).concat(host ? [host] : []);
    return allowed.includes(o.host);
  } catch {
    return false;
  }
}

export function api<C = unknown>(handler: Handler<C>, opts: { rate?: { limit: number; windowMs: number; name: string } } = {}) {
  return async (req: NextRequest, ctx: C) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !sameOrigin(req)) {
        return NextResponse.json({ error: "Origine de la requête refusée" }, { status: 403 });
      }
      if (opts.rate) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
        const r = rateLimit(`${opts.rate.name}:${ip}`, opts.rate.limit, opts.rate.windowMs);
        if (!r.ok) throw new RateLimitError(r.retryAfterSec);
      }
      const out = await handler(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof ZodError) {
    const issues = e.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return NextResponse.json({ error: issues[0]?.message ?? "Requête invalide", issues }, { status: 400 });
  }
  if (e instanceof UserFacingError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
  if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
  if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
  if (e instanceof RateLimitError)
    return NextResponse.json({ error: e.message }, { status: 429, headers: { "Retry-After": String(e.retryAfterSec) } });
  const ref = newId().slice(0, 8);
  log.error("api_error", { ref, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), stack: e instanceof Error ? e.stack?.split("\n").slice(0, 4).join(" | ") : undefined });
  return NextResponse.json({ error: `Une erreur interne est survenue (réf. ${ref}).` }, { status: 500 });
}

/** Lit les paramètres d'URL en objet ; les clés répétées (ex. ?tags=a&tags=b) deviennent des tableaux. */
export function searchParamsToObject(sp: URLSearchParams, arrays: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key).filter((v) => v !== "");
    if (!all.length) continue;
    out[key] = arrays.includes(key) ? all.flatMap((v) => v.split(",")).filter(Boolean) : all[all.length - 1];
  }
  return out;
}
