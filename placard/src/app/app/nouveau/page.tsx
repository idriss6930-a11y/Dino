import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { NewItemForm } from "@/components/NewItemForm";
import { Notice } from "@/components/ui";
import { aiConfigured } from "@/lib/listing/claude";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Nouvel article", robots: { index: false } };

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion?next=/app/nouveau");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-bold">Nouvel article</h1>
      {sp.bienvenue && <Notice tone="ok">Bienvenue, {user.displayName}. Commencez par un article que vous avez sous la main.</Notice>}
      <NewItemForm ai={aiConfigured()} />
    </div>
  );
}
