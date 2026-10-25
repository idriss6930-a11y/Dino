import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { getPublicWorld, countryName } from "@/lib/services/me";
import { CATEGORY_LABELS, listTips } from "@/lib/services/community";
import { NotFoundError } from "@/lib/services/errors";
import { Avatar, TipCard, type TipView } from "@/components/community/TipCard";
import { FollowButton } from "@/components/community/FollowButton";
import { Notice } from "@/components/ui";
import { getDestination } from "@/data/destinations";

export const metadata: Metadata = { title: "Profil de voyageur" };

export default async function TravelerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getSessionUser();
  const world = await getPublicWorld(handle, user).catch((e) => {
    if (e instanceof NotFoundError) return null;
    throw e;
  });
  if (!world) notFound();
  const p = world.profile;
  const tips = await listTips({ author: handle, sort: "recent", limit: 20 }, user);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="card flex flex-wrap items-center gap-4 p-5">
        <Avatar name={p.displayName} color={p.avatarColor} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-deep-900">{p.displayName}</h1>
          <p className="text-sm text-muted">
            @{p.handle} · {p.followers} abonné{p.followers > 1 ? "s" : ""} · membre depuis {new Date(p.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
          {p.bio && <p className="mt-1 text-sm">{p.bio}</p>}
        </div>
        {!p.isSelf && <FollowButton handle={p.handle} initial={p.viewerFollows} loggedIn={!!user} />}
      </header>
      <section className="card p-4">
        <h2 className="mb-2 font-display text-lg font-bold">Carte du monde</h2>
        {world.visible ? (
          <>
            <p className="text-sm">
              {world.stats.countries} pays visités · {world.stats.continents} continents · {world.stats.wishlistCountries} pays rêvés
            </p>
            <p className="mt-2 text-xs text-muted">
              Visités : {[...new Set(world.places.filter((x) => x.status === "visited").map((x) => countryName(x.countryIso)))].join(", ") || "—"}
            </p>
          </>
        ) : (
          <Notice>Ce voyageur garde sa carte privée.</Notice>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="section-title">Conseils publiés</h2>
        {tips.length === 0 && <p className="text-sm text-muted">Aucun conseil publié.</p>}
        {tips.map((t) => (
          <TipCard key={t.id} tip={JSON.parse(JSON.stringify(t)) as TipView} categoryLabel={CATEGORY_LABELS[t.category]} destinationName={getDestination(t.destinationSlug)?.name.fr} loggedIn={!!user} compact />
        ))}
      </section>
    </div>
  );
}
