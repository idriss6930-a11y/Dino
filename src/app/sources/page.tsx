import type { Metadata } from "next";
import { DataBadge, PageHeader } from "@/components/ui";
import { aiConfigured, flightDataMode, flightProviders, hotelDataMode, hotelProviders, SOURCE_CATALOG } from "@/lib/providers/registry";
import { pushConfigured } from "@/lib/services/notifications";
import { DATA_VERSION } from "@/data/destinations";

export const metadata: Metadata = { title: "Sources et transparence" };

export default function SourcesPage() {
  const fm = flightDataMode();
  const hm = hotelDataMode();
  const configured = new Set([...flightProviders(), ...hotelProviders()].filter((p) => p.isConfigured()).map((p) => p.id));
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Sources et transparence" subtitle="D'où viennent les chiffres de DINO, ce qui est réel, estimé ou fictif." mood="thinking" />
      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-display text-lg font-bold">État actuel de ce serveur</h2>
        <p>
          Vols : <strong>{fm === "demo" ? "mode démonstration" : "sources réelles"}</strong> · Hôtels : <strong>{hm === "demo" ? "mode démonstration" : "sources réelles"}</strong> · Assistant IA :{" "}
          <strong>{aiConfigured() ? "Claude (Anthropic) activé" : "analyse automatique sans IA"}</strong> · Push : <strong>{pushConfigured() ? "configuré" : "non configuré"}</strong> · E-mail :{" "}
          <strong>{process.env.SMTP_URL ? "configuré" : "non configuré"}</strong>
        </p>
        <p className="text-xs text-muted">Les données de démonstration et les données réelles ne sont jamais mélangées dans une même liste de résultats.</p>
      </section>
      <section id="demo" className="card space-y-2 p-4 text-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          Mode démonstration <DataBadge kind="demo" />
        </h2>
        <p>
          Sans clé de fournisseur, DINO génère des vols et des hôtels <strong>fictifs</strong> (compagnies « Dino Air (fictive) », hôtels « Le Nid du Raptor »…) à partir d&apos;un modèle déterministe (distance, saison, jour de la semaine, anticipation). Ils servent à tester
          l&apos;application. Ils ne sont pas réservables et ne doivent pas être pris pour de vrais tarifs. L&apos;historique de prix de démonstration est lui aussi synthétique.
        </p>
      </section>
      <section id="editorial" className="card space-y-2 p-4 text-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          Données éditoriales <DataBadge kind="editorial" />
        </h2>
        <p>
          Les {`fiches destinations`} (normales climatiques arrondies, niveau de prix saisonnier relatif, affluence relative, coûts journaliers, événements, pièges et pépites) sont des <strong>ordres de grandeur</strong> rédigés par DINO (version {DATA_VERSION}). Ce ne sont ni
          des comptages ni des tarifs. Les normales climatiques peuvent être remplacées par des moyennes ERA5 calculées via Open-Meteo (commande <code>npm run climate:refresh</code>).
        </p>
      </section>
      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-display text-lg font-bold">Méthodes</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Coût total estimé d&apos;un vol</strong> = prix du billet renvoyé par la source + frais connus correspondant à vos besoins (ex. bagage en soute si vous l&apos;avez coché). Les frais inconnus sont signalés comme tels.
          </li>
          <li>
            <strong>« Acheter ou attendre »</strong> : comparaison du prix actuel avec les prix réellement observés pour exactement le même produit (mêmes dates, classe, voyageurs), tendance linéaire récente et facteurs de calendrier connus. Moins de 7 jours d&apos;observations sur
            6 jours = « données insuffisantes ». Jamais de promesse de baisse.
          </li>
          <li>
            <strong>Hôtels</strong> : un même établissement vu chez plusieurs fournisseurs est rapproché (distance ≤ 150 m et noms similaires) ; on ne compare que des offres aux mêmes dates et pour la même occupation.
          </li>
          <li>
            <strong>Classement « Meilleur choix »</strong> : 65 % coût total, 25 % durée, 10 % escales. Aucun partenaire ne paie pour être mieux classé.
          </li>
          <li>
            <strong>Liens partenaires</strong> : certains liens de réservation sont affiliés (DINO peut toucher une commission). Ils sont marqués « affilié » et n&apos;influencent pas le classement.
          </li>
        </ul>
      </section>
      <section className="card p-4 text-sm">
        <h2 className="mb-2 font-display text-lg font-bold">Catalogue des sources</h2>
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1">Source</th>
              <th>Usage</th>
              <th>Licence / conditions</th>
              <th>Sur ce serveur</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_CATALOG.map((s) => (
              <tr key={s.id} className="border-t border-sage-100 align-top">
                <td className="py-2">
                  {s.url.startsWith("http") ? (
                    <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}
                </td>
                <td>{s.kind}</td>
                <td>{s.license}</td>
                <td>{["flights", "hotels"].includes(s.kind) ? (configured.has(s.id) ? "connectée" : "clé absente") : s.kind === "demo" ? (fm === "demo" || hm === "demo" ? "active" : "inactive") : "utilisée"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
