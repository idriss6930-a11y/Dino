import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ITEM_STATUS, ListingPill, Notice, PriceTag } from "@/components/ui";
import { PLATFORMS } from "@/lib/listing/platforms";
import { dashboardStats, listItems } from "@/lib/services/items";
import { LIMITS, getUsage } from "@/lib/services/plans";
import { getSessionUser } from "@/lib/session";
import { formatEur } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Mes articles", robots: { index: false } };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion?next=/app");
  const [rows, stats, usage] = await Promise.all([listItems(user.id), dashboardStats(user.id), getUsage(user.id)]);
  const pending = rows.filter((r) => r.listings.some((l) => l.status === "to_remove"));
  const limit = LIMITS[user.plan].itemsPerMonth;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Mes articles</h1>
        {user.plan === "free" && (
          <p className="text-sm text-muted">
            {usage.itemsCreated} / {limit} articles créés ce mois-ci · <Link className="link" href="/app/compte">passer à Premium</Link>
          </p>
        )}
      </div>

      {pending.length > 0 && (
        <Notice tone="warn">
          <strong>{pending.length === 1 ? "Un article vendu est encore en ligne ailleurs." : `${pending.length} articles vendus sont encore en ligne ailleurs.`}</strong> Retirez ces annonces pour ne pas vendre deux fois :{" "}
          {pending.map((r, i) => (
            <span key={r.item.id}>
              {i > 0 && ", "}
              <Link className="link" href={`/app/articles/${r.item.id}`}>{r.item.title || r.item.kind}</Link>
            </span>
          ))}
          .
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="En stock" value={String(stats.inStock)} sub={`${stats.online} en ligne`} />
        <Stat label="Vendus ce mois-ci" value={String(stats.soldThisMonth)} sub={`${stats.soldCount} au total`} />
        <Stat label="Bénéfice ce mois-ci" value={formatEur(stats.profitThisMonthCents)} />
        <Stat label="Bénéfice total" value={formatEur(stats.profitTotalCents)} sub={stats.soldWithoutPurchasePrice ? `surestimé : ${stats.soldWithoutPurchasePrice} vente${stats.soldWithoutPurchasePrice > 1 ? "s" : ""} sans prix d'achat` : "frais, envoi et achat déduits"} />
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold">Votre placard est vide</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Ajoutez un premier article : quelques photos, ce que vous en savez, et l&apos;annonce est prête pour les quatre plateformes.</p>
          <Link href="/app/nouveau" className="btn-accent mt-4">Ajouter un article</Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ item, listings, coverId }) => (
            <li key={item.id}>
              <Link href={`/app/articles/${item.id}`} className="card flex h-full gap-3 p-3 transition-colors hover:border-ink">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {coverId && <img src={`/api/photos/${coverId}`} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 font-semibold break-words">{item.title || item.kind}</span>
                    {(item.status === "sold" ? item.soldCents : item.priceCents) !== null && <PriceTag>{formatEur(item.status === "sold" ? item.soldCents : item.priceCents)}</PriceTag>}
                  </div>
                  <div className="mt-1 text-xs text-muted">{ITEM_STATUS[item.status]}{[item.brand, item.size].filter(Boolean).map((v) => ` · ${v}`).join("")}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {listings.filter((l) => l.status !== "removed").map((l) => <ListingPill key={l.platform} label={PLATFORMS[l.platform].label} status={l.status} />)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
