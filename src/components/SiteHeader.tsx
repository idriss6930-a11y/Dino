import Link from "next/link";
import { Bell, Menu, UserRound } from "lucide-react";
import { Dino } from "./Dino";
import { LogoutButton } from "./LogoutButton";
import type { SessionUser } from "@/lib/services/auth";

export const NAV = [
  { href: "/vols", label: "Vols" },
  { href: "/hotels", label: "Hôtels" },
  { href: "/inspiration", label: "Où partir ?" },
  { href: "/destinations", label: "Destinations" },
  { href: "/carte", label: "Carte" },
  { href: "/bons-plans", label: "Bons plans" },
  { href: "/communaute", label: "Communauté" },
  { href: "/assistant", label: "Assistant" },
];

export function SiteHeader({ user, unread }: { user: SessionUser | null; unread: number }) {
  return (
    <header className="sticky top-0 z-[1000] border-b border-sage-100 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2" aria-label="DINO, accueil">
          <Dino mood="happy" size={40} title="DINO" />
          <span className="font-display text-xl font-black tracking-tight text-deep-900">DINO</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-sm font-medium text-deep-800 hover:bg-sage-100">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/alertes#notifications" className="relative rounded-full p-2 text-deep-800 hover:bg-sage-100" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
                <Bell size={20} />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
              </Link>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-sage-200 bg-white py-1 pl-1 pr-3 text-sm font-medium">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: user.avatarColor }} aria-hidden>
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">{user.displayName}</span>
                </summary>
                <div className="card absolute right-0 mt-2 flex w-56 flex-col p-2 text-sm">
                  <Link className="rounded-lg px-3 py-2 hover:bg-sage-50" href="/compte">Mon compte</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-sage-50" href="/mon-monde">Mon monde</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-sage-50" href="/alertes">Mes alertes</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-sage-50" href="/voyages">Mes voyages</Link>
                  <Link className="rounded-lg px-3 py-2 hover:bg-sage-50" href={`/voyageurs/${user.handle}`}>Mon profil public</Link>
                  {user.role !== "user" && <Link className="rounded-lg px-3 py-2 hover:bg-sage-50" href="/moderation">Modération</Link>}
                  <LogoutButton className="rounded-lg px-3 py-2 text-left text-orange-600 hover:bg-orange-400/10" />
                </div>
              </details>
            </>
          ) : (
            <Link href="/compte/connexion" className="btn-primary">
              <UserRound size={16} /> Connexion
            </Link>
          )}
          <details className="relative lg:hidden">
            <summary className="list-none rounded-full p-2 text-deep-800 hover:bg-sage-100" aria-label="Menu">
              <Menu size={22} />
            </summary>
            <nav className="card absolute right-0 mt-2 flex w-60 flex-col p-2 text-sm" aria-label="Menu mobile">
              {[{ href: "/", label: "Accueil" }, ...NAV, { href: "/budget", label: "Budget" }, { href: "/tendances", label: "Tendances" }, { href: "/mon-monde", label: "Mon monde" }].map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 hover:bg-sage-50">
                  {n.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
