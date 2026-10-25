import Link from "next/link";
import { Dino } from "./Dino";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sage-100 bg-deep-900 text-sage-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3">
          <Dino mood="sleeping" size={56} className="shrink-0" />
          <p className="text-sm text-sage-200">
            DINO compare, explique et prévient. Il ne vend pas de billets : les réservations se font chez les partenaires, via des liens clairement indiqués.
          </p>
        </div>
        <FooterCol title="Voyager" links={[["/vols", "Vols"], ["/hotels", "Hôtels"], ["/inspiration", "Je ne sais pas où partir"], ["/budget", "Budget total"]]} />
        <FooterCol title="Découvrir" links={[["/destinations", "Destinations"], ["/carte", "Carte du monde"], ["/tendances", "Tendances"], ["/communaute", "Communauté"]]} />
        <FooterCol title="Transparence" links={[["/sources", "Sources et modes de données"], ["/confidentialite", "Confidentialité"], ["/compte", "Mes données"]]} />
      </div>
      <p className="pb-24 text-center text-xs text-sage-300 lg:pb-6">Liens partenaires signalés « affilié ». Les prix sont donnés à titre indicatif et doivent être confirmés chez le vendeur.</p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 font-display font-bold text-white">{title}</p>
      <ul className="space-y-1 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-orange-400">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
