"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client/fetcher";

export function FollowButton({ handle, initial, loggedIn }: { handle: string; initial: boolean; loggedIn: boolean }) {
  const [on, setOn] = useState(initial);
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={on}
      className={on ? "btn-ghost" : "btn-primary"}
      onClick={async () => {
        if (!loggedIn) return router.push(`/compte/connexion?next=/voyageurs/${handle}`);
        const r = await apiSend<{ following: boolean }>("/api/community/follow", "POST", { handle }).catch(() => null);
        if (r) setOn(r.following);
        router.refresh();
      }}
    >
      {on ? "Abonné·e" : "Suivre"}
    </button>
  );
}
