"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiSend } from "@/lib/client/fetcher";
import { ErrorBox, Notice } from "./ui";

/** N'accepte qu'un chemin interne (évite les redirections ouvertes vers un autre site). */
export function safeNext(next: string | null, fallback = "/app") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl font-bold">{title}</h1>
      <div className="card space-y-4 p-5 sm:p-6">{children}</div>
    </div>
  );
}

function useSubmit() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return { error, busy, run, setBusy };
}

export function LoginForm() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error, busy, run } = useSubmit();
  return (
    <Shell title="Connexion">
      {sp.get("reinitialise") && <Notice tone="ok">Mot de passe modifié. Connectez-vous avec le nouveau.</Notice>}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await apiSend("/api/auth/login", "POST", { email, password });
            window.location.href = safeNext(sp.get("next"));
          });
        }}
      >
        <label className="field">
          E-mail
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Mot de passe
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorBox message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>Se connecter</button>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link className="link" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        <Link className="link" href="/inscription">Créer un compte</Link>
      </div>
    </Shell>
  );
}

export function RegisterForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { error, busy, run } = useSubmit();
  return (
    <Shell title="Créer un compte">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await apiSend("/api/auth/register", "POST", { displayName, email, password, acceptTerms });
            window.location.href = "/app/nouveau?bienvenue=1";
          });
        }}
      >
        <label className="field">
          Prénom ou pseudo
          <input className="input" autoComplete="nickname" required minLength={2} maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="field">
          E-mail
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Mot de passe
          <input className="input" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="hint">10 caractères au minimum. Une phrase est plus sûre qu&apos;un mot.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
          <span>
            J&apos;accepte les <Link className="link" href="/conditions" target="_blank">conditions d&apos;utilisation</Link>, dont l&apos;engagement de ne vendre que des articles que j&apos;ai en main.
          </span>
        </label>
        <ErrorBox message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>Créer mon compte</button>
      </form>
      <p className="text-sm">
        Déjà inscrit ? <Link className="link" href="/connexion">Se connecter</Link>
      </p>
    </Shell>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { error, busy, run, setBusy } = useSubmit();
  return (
    <Shell title="Mot de passe oublié">
      {sent ? (
        <Notice tone="ok">Si un compte existe pour cette adresse, un e-mail avec un lien valable une heure vient d&apos;être envoyé.</Notice>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await apiSend("/api/auth/forgot", "POST", { email });
              setSent(true);
              setBusy(false);
            });
          }}
        >
          <label className="field">
            E-mail du compte
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <ErrorBox message={error} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>Recevoir le lien</button>
        </form>
      )}
      <Link className="link text-sm" href="/connexion">Retour à la connexion</Link>
    </Shell>
  );
}

export function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const { error, busy, run } = useSubmit();
  if (!token) {
    return (
      <Shell title="Nouveau mot de passe">
        <Notice tone="warn">Ce lien est incomplet. Refaites une demande depuis « Mot de passe oublié ».</Notice>
        <Link className="link text-sm" href="/mot-de-passe-oublie">Refaire une demande</Link>
      </Shell>
    );
  }
  return (
    <Shell title="Nouveau mot de passe">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await apiSend("/api/auth/reset", "POST", { token, password });
            window.location.href = "/connexion?reinitialise=1";
          });
        }}
      >
        <label className="field">
          Nouveau mot de passe
          <input className="input" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="hint">10 caractères au minimum. Tous vos appareils seront déconnectés.</span>
        </label>
        <ErrorBox message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>Enregistrer</button>
      </form>
    </Shell>
  );
}
