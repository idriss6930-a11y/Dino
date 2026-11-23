import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Placard — une annonce, quatre plateformes", template: "%s · Placard" },
  description: "Rédigez une annonce de seconde main à partir de vos photos, mettez-la au format de Vinted, eBay, Depop et Vestiaire Collective, et suivez vos ventes et votre bénéfice.",
  applicationName: "Placard",
};
export const viewport: Viewport = { themeColor: "#f7f4ee", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
          Aller au contenu
        </a>
        <SiteHeader user={user} />
        <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 px-4 py-5 text-sm text-muted">
            <span>Placard — pour la revente d&apos;articles que vous avez réellement en main.</span>
            <Link href="/conditions" className="link">Conditions et confidentialité</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
