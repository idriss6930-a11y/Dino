import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileNav } from "@/components/MobileNav";
import { getSessionUser } from "@/lib/session";
import { unreadCount } from "@/lib/services/notifications";
import { flightDataMode, hotelDataMode } from "@/lib/providers/registry";

export const metadata: Metadata = {
  title: { default: "DINO — le compagnon de voyage intelligent", template: "%s · DINO" },
  description: "Comparer les vols et les hôtels, savoir quand réserver, trouver où partir selon son budget et la saison. Données sourcées, estimations signalées.",
  applicationName: "DINO",
};

export const viewport: Viewport = { themeColor: "#214636", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const unread = user ? await unreadCount(user.id) : 0;
  const demo = flightDataMode() === "demo" || hotelDataMode() === "demo";
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-white focus:p-2">
          Aller au contenu
        </a>
        <SiteHeader user={user} unread={unread} />
        {demo && (
          <div className="border-b border-orange-400/40 bg-orange-400/10 px-4 py-1.5 text-center text-xs text-orange-600">
            Mode démonstration : {flightDataMode() === "demo" ? "les vols" : ""}
            {flightDataMode() === "demo" && hotelDataMode() === "demo" ? " et " : ""}
            {hotelDataMode() === "demo" ? "les hôtels" : ""} affichés sont fictifs, marqués « Démo », et ne sont pas réservables.{" "}
            <Link href="/sources" className="font-semibold underline">
              En savoir plus
            </Link>
          </div>
        )}
        <main id="contenu" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          {children}
        </main>
        <SiteFooter />
        <MobileNav />
      </body>
    </html>
  );
}
