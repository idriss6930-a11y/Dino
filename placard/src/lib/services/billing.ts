/**
 * Abonnement Premium via Stripe (Checkout + portail client + webhook), en appels HTTP directs.
 * Sans STRIPE_SECRET_KEY et STRIPE_PRICE_ID, le paiement est désactivé et l'interface le dit.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { log } from "@/lib/log";
import { UserFacingError } from "./errors";

const API = "https://api.stripe.com/v1";
export const billingConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
const appUrl = () => (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");

type Fetch = typeof fetch;

async function stripe<T>(path: string, params: Record<string, string>, fetchImpl: Fetch = fetch): Promise<T> {
  const res = await fetchImpl(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    log.error("stripe_error", { path, status: res.status });
    throw new UserFacingError("Le service de paiement est momentanément indisponible. Réessayez dans quelques minutes.");
  }
  return (await res.json()) as T;
}

export async function createCheckout(userId: string, fetchImpl: Fetch = fetch): Promise<string> {
  if (!billingConfigured()) throw new UserFacingError("Le paiement n'est pas encore activé sur ce site.");
  const db = await getDb();
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (!u) throw new UserFacingError("Compte introuvable");
  if (u.plan === "premium") throw new UserFacingError("Vous êtes déjà abonné à Premium.");
  const session = await stripe<{ url: string }>(
    "/checkout/sessions",
    {
      mode: "subscription",
      "line_items[0][price]": process.env.STRIPE_PRICE_ID!,
      "line_items[0][quantity]": "1",
      client_reference_id: u.id,
      ...(u.stripeCustomerId ? { customer: u.stripeCustomerId } : { customer_email: u.email }),
      success_url: `${appUrl()}/app/compte?abonnement=ok`,
      cancel_url: `${appUrl()}/app/compte?abonnement=annule`,
      allow_promotion_codes: "true",
    },
    fetchImpl,
  );
  return session.url;
}

export async function createPortal(userId: string, fetchImpl: Fetch = fetch): Promise<string> {
  const db = await getDb();
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (!billingConfigured() || !u?.stripeCustomerId) throw new UserFacingError("Aucun abonnement à gérer pour ce compte.");
  const session = await stripe<{ url: string }>("/billing_portal/sessions", { customer: u.stripeCustomerId, return_url: `${appUrl()}/app/compte` }, fetchImpl);
  return session.url;
}

/** Vérifie l'en-tête Stripe-Signature (t=…,v1=…) : HMAC-SHA256 de « t.corps » avec le secret du webhook. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowMs = Date.now(), toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowMs / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  return sigs.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Applique un événement Stripe déjà authentifié. Sans effet si l'événement a déjà été traité. */
export async function applyStripeEvent(event: StripeEvent): Promise<"applied" | "duplicate" | "ignored"> {
  const db = await getDb();
  const inserted = await db.insert(s.stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: s.stripeEvents.id });
  if (!inserted.length) return "duplicate";
  const o = event.data.object;
  if (event.type === "checkout.session.completed") {
    const userId = str(o.client_reference_id);
    if (!userId) return "ignored";
    await db.update(s.users).set({ plan: "premium", stripeCustomerId: str(o.customer), stripeSubscriptionId: str(o.subscription), updatedAt: new Date() }).where(eq(s.users.id, userId));
    return "applied";
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const customer = str(o.customer);
    if (!customer) return "ignored";
    const active = event.type !== "customer.subscription.deleted" && ["active", "trialing", "past_due"].includes(String(o.status));
    await db.update(s.users).set({ plan: active ? "premium" : "free", stripeSubscriptionId: active ? str(o.id) : null, updatedAt: new Date() }).where(eq(s.users.stripeCustomerId, customer));
    return "applied";
  }
  return "ignored";
}
