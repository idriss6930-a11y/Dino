import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, EmptyState } from "@/components/ui";
import { MyWorld } from "@/components/map/MyWorld";
import { getSessionUser } from "@/lib/session";
import { getMe, getWorld } from "@/lib/services/me";

export const metadata: Metadata = { title: "Mon monde" };

export default async function MonMondePage() {
  const user = await getSessionUser();
  if (!user)
    return (
      <>
        <PageHeader title="Mon monde" subtitle="La carte de vos voyages et de vos envies." mood="explorer" />
        <EmptyState mood="explorer" title="Connectez-vous pour créer votre carte">
          Coloriez les pays visités, notez vos envies, suivez vos statistiques. Votre carte est privée par défaut.{" "}
          <Link className="underline" href="/compte/connexion?next=/mon-monde">
            Se connecter
          </Link>{" "}
          ou{" "}
          <Link className="underline" href="/compte/inscription">
            créer un compte
          </Link>
          .
        </EmptyState>
      </>
    );
  const [world, me] = await Promise.all([getWorld(user.id), getMe(user.id)]);
  return (
    <>
      <PageHeader title="Mon monde" subtitle="Pays visités, villes, souvenirs et pays rêvés. Privé par défaut." mood="explorer" />
      <MyWorld initial={JSON.parse(JSON.stringify(world))} mapVisibility={me.privacy?.mapVisibility ?? "private"} />
    </>
  );
}
