import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { AccountPanel } from "@/components/AccountPanel";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { ebayCanPublish, ebayConfigured, ebayConnected } from "@/lib/ebay/client";
import { billingConfigured } from "@/lib/services/billing";
import { LIMITS, getUsage, premiumPriceLabel } from "@/lib/services/plans";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Compte", robots: { index: false } };

const FLASH: Record<string, { tone: "ok" | "warn"; text: string }> = {
  "abonnement=ok": { tone: "ok", text: "Paiement reçu. Premium s'active dès que la banque confirme, en général en moins d'une minute : rechargez la page si la formule n'a pas encore changé." },
  "abonnement=annule": { tone: "warn", text: "Paiement annulé : rien n'a été prélevé." },
  "ebay=ok": { tone: "ok", text: "Votre compte eBay est connecté." },
  "ebay=refuse": { tone: "warn", text: "La connexion à eBay n'a pas abouti. Réessayez depuis cette page." },
  "ebay=erreur": { tone: "warn", text: "eBay a refusé la connexion. Réessayez dans quelques minutes." },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ abonnement?: string; ebay?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion?next=/app/compte");
  const sp = await searchParams;
  const db = await getDb();
  const [row] = await db.select({ customer: s.users.stripeCustomerId }).from(s.users).where(eq(s.users.id, user.id));
  const usage = await getUsage(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-bold">Compte</h1>
      <AccountPanel
        user={{ displayName: user.displayName, email: user.email, plan: user.plan }}
        usage={{ itemsCreated: usage.itemsCreated, itemsLimit: LIMITS.free.itemsPerMonth }}
        priceLabel={premiumPriceLabel()}
        billing={billingConfigured()}
        hasCustomer={Boolean(row?.customer)}
        ebay={{ configured: ebayConfigured(), canPublish: ebayCanPublish(), connected: await ebayConnected(user.id) }}
        flash={FLASH[`abonnement=${sp.abonnement}`] ?? FLASH[`ebay=${sp.ebay}`] ?? null}
      />
    </div>
  );
}
