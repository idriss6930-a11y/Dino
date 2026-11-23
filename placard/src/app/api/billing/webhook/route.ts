import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/log";
import { applyStripeEvent, verifyStripeSignature } from "@/lib/services/billing";

/**
 * Webhook Stripe. Pas de contrôle d'origine ici (l'appel vient de Stripe) : l'authenticité repose sur la
 * signature, vérifiée sur le corps brut avant toute lecture.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const raw = await req.text();
  if (!secret || !verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }
  try {
    const outcome = await applyStripeEvent(JSON.parse(raw));
    return NextResponse.json({ received: true, outcome });
  } catch (e) {
    log.error("stripe_webhook_failed", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Traitement impossible" }, { status: 500 });
  }
}
