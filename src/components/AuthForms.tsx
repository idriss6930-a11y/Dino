"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiSend } from "@/lib/client/fetcher";
import { Dino } from "./Dino";
import { ErrorBox, Notice } from "./ui";

/** N'accepte qu'un chemin interne (évite les redirections ouvertes vers un autre site). */
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

function Shell({ title, mood, children }: { title: string; mood: "happy" | "explorer" | "thinking" | "sleeping"; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex flex-col items-center text-center">
        <Dino mood={mood} size={96} />
        <h1 className="mt-2 text-2xl font-black text-deep-900">{title}</h1>
      </div>
      <div className="card space-y-4 p-6">{children}</div>
    </div>
  );
}

export function LoginForm() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Connexion" mood="happy">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await apiSend("/api/auth/login", "POST", { email, password });
            window.location.href = safeNext(sp.get("next"));
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>E-mail</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <ErrorBox message={error} />}
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          Se connecter
        </button>
      </form>
      <div className="flex justify-between text-sm">
        <Link className="btn-link" href="/compte/mot-de-passe-oublie">
          Mot de passe oublié ?
        </Link>
        <Link className="btn-link" href={`/compte/inscription${sp.get("next") ? `?next=${encodeURIComponent(sp.get("next")!)}` : ""}`}>
          Créer un compte
        </Link>
      </div>
      <p className="text-xs text-muted">Vous pouvez utiliser DINO sans compte. Un compte sert à enregistrer alertes, voyages, carte et préférences.</p>
    </Shell>
  );
}

export function RegisterForm() {
  const sp = useSearchParams();
  const [f, setF] = useState({ displayName: "", email: "", password: "", acceptTerms: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Créer un compte" mood="explorer">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await apiSend("/api/auth/register", "POST", f);
            window.location.href = safeNext(sp.get("next")) === "/" ? "/compte?bienvenue=1" : safeNext(sp.get("next"));
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Nom affiché</span>
          <input className="input" autoComplete="nickname" required minLength={2} maxLength={40} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
        </label>
        <label className="field">
          <span>E-mail</span>
          <input className="input" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input className="input" type="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <small className="text-xs text-muted">10 caractères minimum. Évitez les mots de passe courants ; une phrase de passe est idéale.</small>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={f.acceptTerms} onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })} required />
          <span>
            J&apos;ai lu la{" "}
            <Link className="underline" href="/confidentialite" target="_blank">
              politique de confidentialité
            </Link>
            . Mon profil et ma carte sont privés par défaut.
          </span>
        </label>
        {error && <ErrorBox message={error} />}
        <button type="submit" className="btn-accent w-full py-3" disabled={busy}>
          Créer mon compte
        </button>
      </form>
      <p className="text-center text-sm">
        Déjà inscrit ?{" "}
        <Link className="btn-link" href="/compte/connexion">
          Se connecter
        </Link>
      </p>
    </Shell>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  return (
    <Shell title="Mot de passe oublié" mood="thinking">
      {done ? (
        <Notice>{done}</Notice>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await apiSend<{ message: string }>("/api/auth/forgot", "POST", { email });
              setDone(r.message);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <label className="field">
            <span>E-mail du compte</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <ErrorBox message={error} />}
          <button className="btn-primary w-full py-3" type="submit">
            Recevoir un lien
          </button>
        </form>
      )}
      <p className="text-xs text-muted">Le lien est valable 1 heure. L&apos;envoi d&apos;e-mails nécessite un serveur SMTP configuré (SMTP_URL).</p>
    </Shell>
  );
}

export function ResetForm() {
  const sp = useSearchParams();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  return (
    <Shell title="Nouveau mot de passe" mood="happy">
      {done ? (
        <Notice>
          Mot de passe modifié. Toutes vos sessions ont été fermées par sécurité.{" "}
          <Link className="underline" href="/compte/connexion">
            Se connecter
          </Link>
        </Notice>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await apiSend("/api/auth/reset", "POST", { token: sp.get("token") ?? "", password });
              setDone(true);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <label className="field">
            <span>Nouveau mot de passe</span>
            <input className="input" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <ErrorBox message={error} />}
          <button className="btn-primary w-full py-3" type="submit">
            Enregistrer
          </button>
        </form>
      )}
    </Shell>
  );
}
