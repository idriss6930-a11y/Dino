/** Formules et quotas. Le compteur mensuel ne redescend pas quand on supprime un article. */
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { UserFacingError } from "./errors";

export type Plan = "free" | "premium";
export const LIMITS: Record<Plan, { itemsPerMonth: number; aiPerMonth: number }> = {
  free: { itemsPerMonth: 10, aiPerMonth: 20 },
  // « Illimité » pour un usage normal ; le plafond ne sert qu'à contenir un abus ou un script.
  premium: { itemsPerMonth: 2000, aiPerMonth: 3000 },
};
/** Prix affiché. Doit correspondre au tarif créé dans Stripe (STRIPE_PRICE_ID). */
export const premiumPriceLabel = () => process.env.PLACARD_PRICE_LABEL || "9,90 € par mois";

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

export async function getUsage(userId: string, month = monthKey()) {
  const db = await getDb();
  const [row] = await db.select().from(s.usage).where(and(eq(s.usage.userId, userId), eq(s.usage.month, month)));
  return { itemsCreated: row?.itemsCreated ?? 0, aiGenerations: row?.aiGenerations ?? 0 };
}

async function bump(userId: string, column: "itemsCreated" | "aiGenerations") {
  const db = await getDb();
  const month = monthKey();
  const col = column === "itemsCreated" ? s.usage.itemsCreated : s.usage.aiGenerations;
  await db
    .insert(s.usage)
    .values({ userId, month, [column]: 1 })
    .onConflictDoUpdate({ target: [s.usage.userId, s.usage.month], set: { [column]: sql`${col} + 1` } });
}

export async function consumeItemQuota(user: { id: string; plan: Plan }) {
  const u = await getUsage(user.id);
  if (u.itemsCreated >= LIMITS[user.plan].itemsPerMonth) {
    throw new UserFacingError(
      user.plan === "free"
        ? `Vous avez atteint la limite de ${LIMITS.free.itemsPerMonth} articles par mois de la formule gratuite. Passez à Premium pour continuer, ou revenez le mois prochain.`
        : "Vous avez atteint le plafond mensuel d'articles. Écrivez-nous si c'est un usage normal.",
    );
  }
  await bump(user.id, "itemsCreated");
}

export async function consumeAiQuota(user: { id: string; plan: Plan }) {
  const u = await getUsage(user.id);
  if (u.aiGenerations >= LIMITS[user.plan].aiPerMonth) {
    throw new UserFacingError("Vous avez atteint le nombre de rédactions par IA de votre formule pour ce mois-ci. Vous pouvez toujours rédiger ou corriger l'annonce à la main.");
  }
  await bump(user.id, "aiGenerations");
}
