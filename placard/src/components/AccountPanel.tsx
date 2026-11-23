"use client";
import { useState } from "react";
import { apiSend } from "@/lib/client/fetcher";
import { ErrorBox, Notice } from "./ui";

type Props = {
  user: { displayName: string; email: string; plan: "free" | "premium" };
  usage: { itemsCreated: number; itemsLimit: number };
  priceLabel: string;
  billing: boolean;
  hasCustomer: boolean;
  ebay: { configured: boolean; canPublish: boolean; connected: boolean };
  flash: { tone: "ok" | "warn"; text: string } | null;
};

export function AccountPanel({ user, usage, priceLabel, billing, hasCustomer, ebay, flash }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const goTo = (path: string) => run(async () => { window.location.href = (await apiSend<{ url: string }>(path, "POST")).url; });

  return (
    <div className="space-y-6">
      {flash && <Notice tone={flash.tone}>{flash.text}</Notice>}
      <ErrorBox message={error} />

      <section className="card p-5 sm:p-6" aria-labelledby="h-formule">
        <h2 id="h-formule" className="text-xl font-bold">Formule</h2>
        {user.plan === "premium" ? (
          <>
            <p className="mt-2 text-sm">Vous êtes en <strong>Premium</strong> : articles et rédactions sans limite pour un usage normal.</p>
            {hasCustomer && billing && <button className="btn-ghost mt-4" disabled={busy} onClick={() => goTo("/api/billing/portal")}>Gérer ou résilier mon abonnement</button>}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm">Vous êtes en formule <strong>gratuite</strong> : {usage.itemsCreated} article{usage.itemsCreated > 1 ? "s" : ""} créé{usage.itemsCreated > 1 ? "s" : ""} sur {usage.itemsLimit} ce mois-ci.</p>
            <p className="mt-1 text-sm text-muted">Premium : articles sans limite, {priceLabel}, résiliable à tout moment.</p>
            {billing ? (
              <button className="btn-accent mt-4" disabled={busy} onClick={() => goTo("/api/billing/checkout")}>Passer à Premium</button>
            ) : (
              <p className="mt-3 text-sm text-muted">Le paiement en ligne n&apos;est pas encore activé sur ce site : Premium n&apos;est pas disponible pour le moment.</p>
            )}
          </>
        )}
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="h-ebay">
        <h2 id="h-ebay" className="text-xl font-bold">eBay</h2>
        {!ebay.configured ? (
          <p className="mt-2 text-sm text-muted">La publication directe sur eBay n&apos;est pas activée sur ce site. Vous pouvez toujours copier vos annonces vers eBay, comme pour les autres plateformes.</p>
        ) : ebay.connected ? (
          <>
            <p className="mt-2 text-sm">Votre compte eBay est connecté. {ebay.canPublish ? "Le bouton « Publier sur eBay » apparaît sur chaque article." : "La publication reste indisponible tant que le site n'a pas d'adresse publique en https."}</p>
            <button className="btn-ghost mt-4" disabled={busy} onClick={() => run(async () => { await apiSend("/api/ebay/disconnect", "POST"); window.location.reload(); })}>Déconnecter eBay</button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm">Connectez votre compte pour publier sur eBay en un clic, par l&apos;interface officielle d&apos;eBay. Placard ne voit jamais votre mot de passe eBay.</p>
            <a className="btn-accent mt-4" href="/api/ebay/connect">Connecter mon compte eBay</a>
          </>
        )}
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="h-compte">
        <h2 id="h-compte" className="text-xl font-bold">Compte</h2>
        <p className="mt-2 text-sm">{user.displayName} · {user.email}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-ghost" href="/api/me/export">Télécharger mes données</a>
          <button className="btn-ghost" disabled={busy} onClick={() => run(async () => { await apiSend("/api/auth/logout", "POST"); window.location.href = "/"; })}>Se déconnecter</button>
        </div>
        <form
          className="mt-6 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!window.confirm("Supprimer définitivement votre compte, vos articles et vos photos ?")) return;
            run(async () => { await apiSend("/api/me/delete", "POST", { password }); window.location.href = "/?compte=supprime"; });
          }}
        >
          <h3 className="font-semibold">Supprimer mon compte</h3>
          <p className="mt-1 text-sm text-muted">Tout est effacé immédiatement. {user.plan === "premium" ? "Résiliez d'abord votre abonnement, sinon il continuera d'être prélevé." : ""}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="field">
              Mot de passe
              <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button type="submit" className="btn-danger" disabled={busy}>Supprimer mon compte</button>
          </div>
        </form>
      </section>
    </div>
  );
}
