import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { NewTipForm } from "@/components/community/NewTipForm";
import { CATEGORY_LABELS } from "@/lib/services/community";
import { getSessionUser } from "@/lib/session";
import { DESTINATIONS } from "@/data/destinations";

export const metadata: Metadata = { title: "Partager un conseil" };

export default async function NewTipPage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/compte/connexion?next=/communaute/nouveau");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Partager un conseil" subtitle="Un conseil utile est concret, daté et honnête. Les contenus sponsorisés doivent être déclarés." mood="explorer" />
      <NewTipForm cities={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name.fr }))} categories={CATEGORY_LABELS} initialDestination={sp.destination} />
    </div>
  );
}
