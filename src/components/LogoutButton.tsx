"use client";
import { useState } from "react";
import { apiSend } from "@/lib/client/fetcher";

export function LogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await apiSend("/api/auth/logout", "POST").catch(() => null);
        window.location.href = "/";
      }}
    >
      Se déconnecter
    </button>
  );
}
