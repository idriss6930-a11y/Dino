import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, EmptyState } from "@/components/ui";
import { TipCard, type TipView } from "@/components/community/TipCard";
import { CATEGORY_LABELS, KIND_LABELS, listTips } from "@/lib/services/community";
import { getSessionUser } from "@/lib/session";
import { DESTINATIONS, getDestination } from "@/data/destinations";

export const metadata: Metadata = { title: "Communauté" };

export default async function CommunautePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const filters = {
    destination: sp.destination || undefined,
    category: sp.category || undefined,
    kind: sp.kind || undefined,
    since: sp.since || undefined,
    sort: sp.sort === "recent" ? "recent" : "useful",
    following: sp.following === "true" && user ? "true" : undefined,
    limit: 40,
  };
  const tips = await listTips(filters, user);
  return (
    <>
      <PageHeader title="Communauté" subtitle="Conseils concrets de voyageurs, classés par utilité réelle et non par popularité seule." mood="happy">
        <Link href={user ? "/communaute/nouveau" : "/compte/connexion?next=/communaute/nouveau"} className="btn-accent">
          Partager un conseil
        </Link>
      </PageHeader>
      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6" method="get" aria-label="Filtrer les conseils">
        <label className="field">
          <span>Destination</span>
          <select className="input" name="destination" defaultValue={filters.destination ?? ""}>
            <option value="">Toutes</option>
            {DESTINATIONS.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name.fr}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Catégorie</span>
          <select className="input" name="category" defaultValue={filters.category ?? ""}>
            <option value="">Toutes</option>
            {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Type</span>
          <select className="input" name="kind" defaultValue={filters.kind ?? ""}>
            <option value="">Tous</option>
            {Object.entries(KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Publié depuis</span>
          <select className="input" name="since" defaultValue={filters.since ?? ""}>
            <option value="">Toujours</option>
            <option value="30">30 jours</option>
            <option value="180">6 mois</option>
            <option value="365">1 an</option>
          </select>
        </label>
        <label className="field">
          <span>Tri</span>
          <select className="input" name="sort" defaultValue={filters.sort}>
            <option value="useful">Les plus utiles</option>
            <option value="recent">Les plus récents</option>
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2">
          {user && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="following" value="true" defaultChecked={!!filters.following} /> Mes abonnements
            </label>
          )}
          <button type="submit" className="btn-primary">
            Filtrer
          </button>
        </div>
      </form>
      {tips.length === 0 ? (
        <EmptyState mood="thinking" title="Aucun conseil pour ces filtres">
          Les conseils publiés par les voyageurs apparaîtront ici. Les contenus de démonstration (créés par <code>npm run db:seed</code>) sont marqués « Démo ».
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tips.map((t) => (
            <TipCard key={t.id} tip={JSON.parse(JSON.stringify(t)) as TipView} categoryLabel={CATEGORY_LABELS[t.category]} destinationName={getDestination(t.destinationSlug)?.name.fr} loggedIn={!!user} />
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-muted">
        Classement « utile » : votes « utile », enregistrements et commentaires (échelle logarithmique), vérification récente, réputation de l&apos;auteur, fraîcheur (les conseils de prix et de transport vieillissent plus vite), pénalité en cas de signalements. Les contenus sponsorisés sont déclarés et légèrement déclassés.
      </p>
    </>
  );
}
