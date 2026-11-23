import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions et confidentialité" };

export default function TermsPage() {
  const publisher = process.env.PLACARD_LEGAL_NAME;
  const contact = process.env.PLACARD_LEGAL_CONTACT;
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-4xl font-bold">Conditions et confidentialité</h1>

      <section className="space-y-2">
        <h2 className="text-2xl font-bold">Qui édite ce site</h2>
        {publisher ? (
          <p>{publisher}{contact ? ` — contact : ${contact}` : ""}.</p>
        ) : (
          <p className="text-muted">L&apos;éditeur n&apos;est pas renseigné : ce site est une version de démonstration, qui ne doit pas encaisser de paiements en l&apos;état.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-bold">Ce que vous vous engagez à faire</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>N&apos;utiliser Placard que pour des articles que vous avez réellement en votre possession.</li>
          <li>Décrire vos articles honnêtement, défauts compris, et ne pas présenter comme authentique une pièce dont vous doutez.</li>
          <li>Respecter les règles de chaque plateforme où vous publiez, ainsi que vos obligations de vendeur (déclaration de revenus, statut professionnel si vous achetez pour revendre).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-bold">Ce que fait le service, et ses limites</h2>
        <p>Placard prépare des annonces et tient un suivi. Vous restez l&apos;auteur et le responsable de ce que vous publiez. Les estimations de prix et de frais sont indicatives. Les textes proposés doivent être relus avant publication.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-bold">Vos données</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nous conservons votre adresse e-mail, votre mot de passe sous forme hachée, vos articles, vos photos et vos ventes.</li>
          <li>Si la rédaction par IA est activée, vos photos et vos indications sont envoyées à Anthropic pour rédiger l&apos;annonce.</li>
          <li>Les photos sont accessibles par une adresse longue et aléatoire, sans connexion, pour que les plateformes puissent les lire. Quiconque possède cette adresse peut voir la photo.</li>
          <li>Les paiements sont traités par Stripe : nous ne voyons jamais votre numéro de carte.</li>
          <li>Aucun traceur publicitaire, aucune revente de données.</li>
          <li>Depuis la page Compte, vous pouvez télécharger toutes vos données ou supprimer votre compte, ce qui efface tout immédiatement.</li>
        </ul>
      </section>
    </article>
  );
}
