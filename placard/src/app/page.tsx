import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice, PriceTag } from "@/components/ui";
import { aiConfigured } from "@/lib/listing/claude";
import { billingConfigured } from "@/lib/services/billing";
import { LIMITS, premiumPriceLabel } from "@/lib/services/plans";
import { getSessionUser } from "@/lib/session";

const STEPS = [
  { n: "1", title: "Photographiez", text: "Jusqu'à cinq photos de l'article, et ce que vous en savez : marque, taille, état, défauts." },
  { n: "2", title: "L'annonce s'écrit", text: "Titre, description et mots-clés sont rédigés à partir de vos photos et de vos indications. Vous corrigez ce que vous voulez." },
  { n: "3", title: "Diffusez partout", text: "L'annonce est mise au format de chaque plateforme, champ par champ, prête à coller. Sur eBay, elle part en un clic." },
  { n: "4", title: "Suivez vos ventes", text: "Vendu quelque part ? Placard vous rappelle de retirer l'annonce ailleurs et calcule ce qu'il vous reste vraiment." },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  if (await getSessionUser()) redirect("/app");
  const sp = await searchParams;
  const ai = aiConfigured();
  return (
    <div className="space-y-16 sm:space-y-24">
      {sp.compte === "supprime" && <Notice tone="ok">Votre compte et toutes vos données ont été supprimés.</Notice>}

      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-4xl leading-[1.05] font-bold sm:text-6xl">Une annonce.<br />Quatre plateformes.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Placard rédige l&apos;annonce de l&apos;article que vous revendez, la met au format de Vinted, eBay, Depop et Vestiaire Collective, puis suit ce qui est vendu et ce que vous avez gagné.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/inscription" className="btn-accent px-6 text-base">Essayer gratuitement</Link>
            <span className="text-sm text-muted">{LIMITS.free.itemsPerMonth} articles par mois, sans carte bancaire.</span>
          </div>
        </div>

        <div aria-hidden className="card rotate-1 p-5 shadow-[6px_6px_0_var(--color-ink)]">
          <div className="flex items-start justify-between gap-3">
            <div className="font-semibold">Veste en jean Levi&apos;s bleu délavé, coupe droite, taille M</div>
            <PriceTag>28 €</PriceTag>
          </div>
          <p className="mt-3 text-sm whitespace-pre-line text-muted">{"Veste en jean Levi's bleu délavé, coupe droite.\nTaille : M\nÉtat : bon état. À noter : petite tache sur la manche gauche."}</p>
          <div className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium">
            <span className="rounded-full border border-denim-100 bg-denim-50 px-2 py-0.5 text-denim-700">Vinted · en ligne</span>
            <span className="rounded-full border border-denim-100 bg-denim-50 px-2 py-0.5 text-denim-700">eBay · en ligne</span>
            <span className="rounded-full border border-tag-500/40 bg-tag-50 px-2 py-0.5 text-tag-700">Depop · à retirer</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="h-comment">
        <h2 id="h-comment" className="text-3xl font-bold">Comment ça marche</h2>
        <ol className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 border-t border-ink pt-4">
              <span className="font-display text-3xl font-bold text-tag-500 tabular-nums">{s.n}</span>
              <div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {!ai && <p className="mt-6 text-sm text-muted">Sur ce site, la rédaction par IA n&apos;est pas activée : l&apos;annonce est assemblée à partir de vos indications, sans analyse des photos ni estimation de prix.</p>}
      </section>

      <section aria-labelledby="h-limites" className="rounded-xl bg-ink p-6 text-paper sm:p-10">
        <h2 id="h-limites" className="text-3xl font-bold">Ce que Placard ne fait pas, et pourquoi</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-3">
          <li>
            <h3 className="font-bold">Pas de dropshipping</h3>
            <p className="mt-1 text-sm text-paper/75">Vinted et Depop interdisent de vendre un article que vous n&apos;avez pas. Placard sert à revendre ce qui est réellement dans votre placard.</p>
          </li>
          <li>
            <h3 className="font-bold">Pas de robot</h3>
            <p className="mt-1 text-sm text-paper/75">Seul eBay offre une interface officielle de publication. Ailleurs, c&apos;est vous qui collez et validez : votre compte ne risque rien.</p>
          </li>
          <li>
            <h3 className="font-bold">Pas de chiffres inventés</h3>
            <p className="mt-1 text-sm text-paper/75">Une estimation de prix est toujours signalée comme telle. Les frais des plateformes sont des estimations que vous corrigez à chaque vente.</p>
          </li>
        </ul>
      </section>

      <section id="tarifs" aria-labelledby="h-tarifs" className="scroll-mt-6">
        <h2 id="h-tarifs" className="text-3xl font-bold">Tarifs</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-xl font-bold">Gratuit</h3>
            <p className="mt-1 font-display text-4xl font-bold">0 €</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li>{LIMITS.free.itemsPerMonth} articles par mois</li>
              <li>Annonce au format des quatre plateformes</li>
              <li>Suivi des ventes et du bénéfice</li>
            </ul>
            <Link href="/inscription" className="btn-ghost mt-6 w-full">Créer un compte</Link>
          </div>
          <div className="card border-ink p-6">
            <h3 className="text-xl font-bold">Premium</h3>
            <p className="mt-1 font-display text-4xl font-bold">{premiumPriceLabel()}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li>Articles sans limite</li>
              <li>Tout ce que contient la formule gratuite</li>
              <li>Résiliable à tout moment</li>
            </ul>
            {billingConfigured() ? (
              <Link href="/inscription" className="btn-primary mt-6 w-full">Commencer</Link>
            ) : (
              <p className="mt-6 text-sm text-muted">Le paiement en ligne n&apos;est pas encore activé sur ce site.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
