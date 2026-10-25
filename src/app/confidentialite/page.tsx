import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Confidentialité" };

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed">
      <PageHeader title="Confidentialité" subtitle="Ce que DINO collecte, pourquoi, combien de temps, et comment tout récupérer ou supprimer." mood="sleeping" />
      <p className="rounded-xl bg-orange-400/10 p-3 text-xs text-orange-600">
        Modèle de politique fourni avec le logiciel : l&apos;exploitant du service doit y indiquer son identité, ses coordonnées et la faire valider par un conseil juridique avant mise en production.
      </p>
      <Section title="Utilisation sans compte">
        Toutes les recherches (vols, hôtels, inspiration, budget, assistant) fonctionnent sans compte. Aucun cookie publicitaire ni traceur tiers n&apos;est utilisé. Le seul cookie est le cookie de session, posé uniquement après connexion.
      </Section>
      <Section title="Données d'un compte">
        E-mail, nom affiché, mot de passe (stocké uniquement sous forme de hachage scrypt), préférences de voyage déclarées (aéroport, budget habituel, styles, températures), alertes, voyages, carte « Mon monde », contributions à la communauté. DINO ne collecte jamais de données
        sensibles (santé, religion, opinions…) ni les identifiants de comptes tiers (compagnies, hôtels).
      </Section>
      <Section title="Visibilité">
        Profil, carte et voyages sont <strong>privés par défaut</strong>. Vous choisissez « moi uniquement », « amis » (abonnements mutuels) ou « tout le monde ». Les souvenirs et dates de voyage ne sont jamais publics. Aucune localisation GPS précise n&apos;est enregistrée.
      </Section>
      <Section title="Personnalisation">
        Les recommandations utilisent vos styles déclarés, vos envies et les destinations consultées. Désactivable à tout moment : la désactivation efface les signaux collectés. L&apos;historique de recherche n&apos;est conservé que si vous l&apos;activez (désactivé par défaut).
      </Section>
      <Section title="Durées de conservation">
        Tentatives de connexion : 30 jours. Historique de recherche (si activé) : 90 jours. Signaux de recommandation et notifications : 180 jours. Sessions : 30 jours. Liens de réinitialisation : 1 heure. Compte : jusqu&apos;à sa suppression.
      </Section>
      <Section title="Vos droits">
        Depuis « Mon compte » : export complet de vos données (JSON), modification, suppression définitive et immédiate du compte et de toutes les données associées. Vous pouvez aussi contacter l&apos;exploitant du service et saisir l&apos;autorité de protection des données
        compétente (en France : la CNIL).
      </Section>
      <Section title="Sous-traitants possibles">
        Selon la configuration du serveur : fournisseurs de données de voyage (recherches transmises sans votre identité), fournisseur d&apos;IA (vos questions à l&apos;assistant, sans votre e-mail), service d&apos;envoi d&apos;e-mails, service de notifications push du navigateur.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-1 font-display text-lg font-bold text-deep-900">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
