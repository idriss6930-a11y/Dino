"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, EyeOff } from "lucide-react";
import { apiSend } from "@/lib/client/fetcher";

/** Ajoute / retire une destination de la liste de souhaits (compte requis). */
export function WishlistButton({ slug, initial, loggedIn }: { slug: string; initial: boolean; loggedIn: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      className={on ? "btn bg-orange-500 text-white hover:bg-orange-600" : "btn-ghost"}
      aria-pressed={on}
      disabled={busy}
      onClick={async () => {
        if (!loggedIn) return router.push(`/compte/connexion?next=/destinations/${slug}`);
        setBusy(true);
        try {
          const r = await apiSend<{ saved: boolean }>("/api/wishlist", "POST", { slug });
          setOn(r.saved);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heart size={16} fill={on ? "currentColor" : "none"} /> {on ? "Dans mes envies" : "J'aimerais y aller"}
    </button>
  );
}

/** « Pas pour moi » : retire la destination des recommandations personnelles. */
export function DismissButton({ slug }: { slug: string }) {
  const [done, setDone] = useState(false);
  if (done) return <span className="text-xs text-muted">Masqué de vos suggestions</span>;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-muted hover:text-deep-800"
      onClick={async () => {
        await apiSend("/api/me/interactions", "POST", { slug, kind: "dismiss" }).catch(() => null);
        setDone(true);
      }}
    >
      <EyeOff size={14} /> Pas pour moi
    </button>
  );
}
