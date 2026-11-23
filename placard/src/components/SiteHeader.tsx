import Link from "next/link";
import type { SessionUser } from "@/lib/services/auth";

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect x="2" y="2" width="22" height="22" rx="4" fill="#1b1a17" />
        <path d="M13 3v20" stroke="#f7f4ee" strokeWidth="1.5" />
        <circle cx="10" cy="13" r="1.3" fill="#d9532b" />
        <circle cx="16" cy="13" r="1.3" fill="#d9532b" />
      </svg>
      Placard
    </span>
  );
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href={user ? "/app" : "/"} aria-label="Placard, accueil">
          <Logo />
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-1 text-sm font-semibold">
          {user ? (
            <>
              <Link href="/app" className="rounded-lg px-3 py-2 hover:bg-paper-dark">Mes articles</Link>
              <Link href="/app/compte" className="rounded-lg px-3 py-2 hover:bg-paper-dark">Compte</Link>
              <Link href="/app/nouveau" className="btn-accent ml-1">Nouvel article</Link>
            </>
          ) : (
            <>
              <Link href="/#tarifs" className="rounded-lg px-3 py-2 hover:bg-paper-dark">Tarifs</Link>
              <Link href="/connexion" className="rounded-lg px-3 py-2 hover:bg-paper-dark">Connexion</Link>
              <Link href="/inscription" className="btn-primary ml-1">Essayer</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
