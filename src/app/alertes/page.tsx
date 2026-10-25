import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, EmptyState } from "@/components/ui";
import { AlertsManager } from "@/components/AlertsManager";
import { getSessionUser } from "@/lib/session";
import { listAlerts, PLAN_LIMITS } from "@/lib/services/alerts";
import { listNotifications, pushConfigured } from "@/lib/services/notifications";
import { DESTINATIONS } from "@/data/destinations";

export const metadata: Metadata = { title: "Alertes de prix" };

export default async function AlertesPage() {
  const user = await getSessionUser();
  if (!user)
    return (
      <>
        <PageHeader title="Alertes de prix" mood="sleeping" />
        <EmptyState mood="sleeping" title="Connectez-vous pour créer des alertes">
          DINO surveille un trajet, un hôtel ou un budget et vous prévient quand le prix baisse vraiment.{" "}
          <Link className="underline" href="/compte/connexion?next=/alertes">
            Se connecter
          </Link>
        </EmptyState>
      </>
    );
  const [alerts, notifications] = await Promise.all([listAlerts(user.id), listNotifications(user.id)]);
  return (
    <>
      <PageHeader title="Alertes de prix" subtitle="DINO surveille pour vous, sans spam : une notification uniquement pour un vrai changement." mood="surprised" />
      <AlertsManager
        initialAlerts={JSON.parse(JSON.stringify(alerts))}
        initialNotifications={JSON.parse(JSON.stringify(notifications))}
        cities={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name.fr }))}
        plan={user.plan}
        limits={PLAN_LIMITS[user.plan]}
        pushAvailable={pushConfigured()}
        emailAvailable={!!process.env.SMTP_URL}
        vapidKey={pushConfigured() ? (process.env.VAPID_PUBLIC_KEY ?? null) : null}
      />
    </>
  );
}
