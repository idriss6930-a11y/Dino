import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ItemWorkspace } from "@/components/ItemWorkspace";
import { ebayCanPublish, ebayConnected } from "@/lib/ebay/client";
import { aiConfigured } from "@/lib/listing/claude";
import { plain, type ItemBundle } from "@/lib/listing/dto";
import { NotFoundError } from "@/lib/services/errors";
import { getItem } from "@/lib/services/items";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Article", robots: { index: false } };

export default async function ItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ probleme?: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/connexion?next=/app/articles/${encodeURIComponent(id)}`);
  const bundle = await getItem(user.id, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const ebayReady = ebayCanPublish();
  return (
    <div className="mx-auto max-w-3xl">
      <ItemWorkspace
        initial={plain<ItemBundle>(bundle)}
        config={{ ai: aiConfigured(), ebayReady, ebayConnected: ebayReady && (await ebayConnected(user.id)) }}
        problem={(await searchParams).probleme?.slice(0, 300)}
      />
    </div>
  );
}
