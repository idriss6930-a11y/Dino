import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TipCard, type TipView } from "@/components/community/TipCard";
import { Comments } from "@/components/community/Comments";
import { CATEGORY_LABELS, getTip } from "@/lib/services/community";
import { NotFoundError } from "@/lib/services/errors";
import { getSessionUser } from "@/lib/session";
import { getDestination } from "@/data/destinations";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Conseil de voyageur" };

export default async function TipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const tip = await getTip(id, user).catch((e) => {
    if (e instanceof NotFoundError) return null;
    throw e;
  });
  if (!tip) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/communaute" className="btn-link text-sm">
        ← Tous les conseils
      </Link>
      {tip.status !== "published" && <Notice tone="warn">Ce conseil est en attente de modération : il n&apos;est visible que par vous et l&apos;équipe de modération.</Notice>}
      <TipCard tip={JSON.parse(JSON.stringify(tip)) as TipView} categoryLabel={CATEGORY_LABELS[tip.category]} destinationName={getDestination(tip.destinationSlug)?.name.fr} loggedIn={!!user} asPageTitle />
      <Comments tipId={tip.id} comments={JSON.parse(JSON.stringify(tip.comments))} loggedIn={!!user} />
    </div>
  );
}
