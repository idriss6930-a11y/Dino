"use client";
import { useState } from "react";
import clsx from "clsx";
import { Download } from "lucide-react";
import { apiSend } from "@/lib/client/fetcher";
import { PlaceInput } from "./PlaceInput";
import { ErrorBox, Notice } from "./ui";

type Prefs = {
  homeAirport: string | null;
  currency: string;
  typicalBudgetCents: number | null;
  travelStyles: string[];
  climateMinC: number | null;
  climateMaxC: number | null;
  personalizationEnabled: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  maxAlertNotificationsPerDay: number;
};
type Privacy = { profileVisibility: "public" | "friends" | "private"; mapVisibility: "public" | "friends" | "private"; showTrips: boolean; storeSearchHistory: boolean };
type User = { email: string; displayName: string; handle: string; bio: string; plan: string; createdAt: string };

const VIS = { private: "Moi uniquement", friends: "Amis (abonnements mutuels)", public: "Tout le monde" };

export function AccountSettings({ user, prefs, privacy, tags, homeLabel }: { user: User; prefs: Prefs; privacy: Privacy; tags: Record<string, string>; homeLabel: string }) {
  const [p, setP] = useState({
    displayName: user.displayName,
    bio: user.bio,
    home: { code: prefs.homeAirport ?? "", label: prefs.homeAirport ? homeLabel : "" },
    currency: prefs.currency,
    typicalBudget: prefs.typicalBudgetCents ? String(prefs.typicalBudgetCents / 100) : "",
    travelStyles: prefs.travelStyles,
    climateMinC: prefs.climateMinC?.toString() ?? "",
    climateMaxC: prefs.climateMaxC?.toString() ?? "",
    personalizationEnabled: prefs.personalizationEnabled,
    notifyEmail: prefs.notifyEmail,
    notifyPush: prefs.notifyPush,
    maxAlertNotificationsPerDay: String(prefs.maxAlertNotificationsPerDay),
    ...privacy,
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [del, setDel] = useState({ password: "", confirm: "" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await apiSend("/api/me", "PATCH", {
        displayName: p.displayName,
        bio: p.bio,
        homeAirport: p.home.code && /^[A-Z]{3}$/.test(p.home.code) ? p.home.code : null,
        currency: p.currency,
        typicalBudget: p.typicalBudget ? Number(p.typicalBudget) : null,
        travelStyles: p.travelStyles,
        climateMinC: p.climateMinC === "" ? null : Number(p.climateMinC),
        climateMaxC: p.climateMaxC === "" ? null : Number(p.climateMaxC),
        personalizationEnabled: p.personalizationEnabled,
        notifyEmail: p.notifyEmail,
        notifyPush: p.notifyPush,
        maxAlertNotificationsPerDay: Number(p.maxAlertNotificationsPerDay),
        profileVisibility: p.profileVisibility,
        mapVisibility: p.mapVisibility,
        showTrips: p.showTrips,
        storeSearchHistory: p.storeSearchHistory,
      });
      setMsg("Préférences enregistrées.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={save} aria-label="Préférences">
        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="font-display text-lg font-bold sm:col-span-2">Profil</h2>
          <label className="field">
            <span>Nom affiché</span>
            <input className="input" value={p.displayName} onChange={(e) => setP({ ...p, displayName: e.target.value })} minLength={2} maxLength={40} />
          </label>
          <p className="text-sm text-muted sm:pt-6">
            E-mail : {user.email} · identifiant public : @{user.handle} · formule {user.plan === "premium" ? "Premium" : "gratuite"}
          </p>
          <label className="field sm:col-span-2">
            <span>Bio (publique selon vos réglages)</span>
            <textarea className="input" rows={2} maxLength={400} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} />
          </label>
        </section>

        <section className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="font-display text-lg font-bold sm:col-span-2 lg:col-span-4">Voyage</h2>
          <div className="sm:col-span-2">
            <PlaceInput name="home" label="Aéroport habituel" value={p.home} onChange={(v) => setP({ ...p, home: v })} />
          </div>
          <label className="field">
            <span>Devise d&apos;affichage</span>
            <select className="input" value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })}>
              {["EUR", "USD", "GBP", "CHF", "CAD"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Budget habituel / pers. (€)</span>
            <input className="input" inputMode="numeric" value={p.typicalBudget} onChange={(e) => setP({ ...p, typicalBudget: e.target.value.replace(/[^\d]/g, "") })} />
          </label>
          <label className="field">
            <span>Température idéale min (°C)</span>
            <input className="input" inputMode="numeric" value={p.climateMinC} onChange={(e) => setP({ ...p, climateMinC: e.target.value.replace(/[^\d-]/g, "") })} />
          </label>
          <label className="field">
            <span>Température idéale max (°C)</span>
            <input className="input" inputMode="numeric" value={p.climateMaxC} onChange={(e) => setP({ ...p, climateMaxC: e.target.value.replace(/[^\d-]/g, "") })} />
          </label>
          <fieldset className="sm:col-span-2 lg:col-span-4">
            <legend className="mb-1 text-sm font-medium text-deep-800">Mes styles de voyage</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(tags).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={p.travelStyles.includes(k)}
                  className={clsx("chip", p.travelStyles.includes(k) ? "border-deep-800 bg-deep-800 text-white" : "border-sage-200 bg-white")}
                  onClick={() => setP({ ...p, travelStyles: p.travelStyles.includes(k) ? p.travelStyles.filter((x) => x !== k) : [...p.travelStyles, k].slice(0, 8) })}
                >
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-display text-lg font-bold">Confidentialité</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>Qui voit mon profil (bio) ?</span>
              <select className="input" value={p.profileVisibility} onChange={(e) => setP({ ...p, profileVisibility: e.target.value as Privacy["profileVisibility"] })}>
                {Object.entries(VIS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Qui voit ma carte « Mon monde » ?</span>
              <select className="input" value={p.mapVisibility} onChange={(e) => setP({ ...p, mapVisibility: e.target.value as Privacy["mapVisibility"] })}>
                {Object.entries(VIS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Toggle checked={p.personalizationEnabled} onChange={(v) => setP({ ...p, personalizationEnabled: v })} label="Recommandations personnalisées" help="Utilise vos styles, vos envies et les destinations consultées. Désactiver efface ces signaux et affiche une sélection non personnalisée." />
          <Toggle checked={p.storeSearchHistory} onChange={(v) => setP({ ...p, storeSearchHistory: v })} label="Conserver mon historique de recherche (90 jours)" help="Désactivé par défaut. Désactiver efface l'historique existant." />
        </section>

        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="font-display text-lg font-bold sm:col-span-2">Notifications</h2>
          <Toggle checked={p.notifyEmail} onChange={(v) => setP({ ...p, notifyEmail: v })} label="E-mails d'alerte" help="Nécessite un serveur d'envoi configuré." />
          <Toggle checked={p.notifyPush} onChange={(v) => setP({ ...p, notifyPush: v })} label="Notifications push" help="À activer aussi sur chaque appareil depuis « Mes alertes »." />
          <label className="field">
            <span>Maximum de notifications d&apos;alerte par jour</span>
            <input className="input" type="number" min={1} max={20} value={p.maxAlertNotificationsPerDay} onChange={(e) => setP({ ...p, maxAlertNotificationsPerDay: e.target.value })} />
          </label>
        </section>

        {msg && <Notice>{msg}</Notice>}
        {error && <ErrorBox message={error} />}
        <button type="submit" className="btn-primary px-6 py-3">
          Enregistrer mes préférences
        </button>
      </form>

      <section className="grid gap-4 lg:grid-cols-3">
        <form
          className="card space-y-2 p-4"
          aria-label="Changer de mot de passe"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await apiSend("/api/me/password", "POST", pw);
              setPw({ current: "", next: "" });
              setMsg("Mot de passe modifié.");
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <h2 className="font-display text-lg font-bold">Mot de passe</h2>
          <input className="input" type="password" placeholder="Mot de passe actuel" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          <input className="input" type="password" placeholder="Nouveau mot de passe" autoComplete="new-password" minLength={10} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
          <button className="btn-ghost w-full" type="submit">
            Changer
          </button>
        </form>
        <div className="card space-y-2 p-4">
          <h2 className="font-display text-lg font-bold">Mes données</h2>
          <p className="text-sm text-muted">Téléchargez toutes vos données (profil, alertes, voyages, carte, contributions) au format JSON.</p>
          <a className="btn-ghost w-full" href="/api/me/export">
            <Download size={16} /> Exporter mes données
          </a>
        </div>
        <form
          className="card space-y-2 border-orange-400/60 p-4"
          aria-label="Supprimer mon compte"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await apiSend("/api/me/delete", "POST", del);
              window.location.href = "/?compte-supprime=1";
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <h2 className="font-display text-lg font-bold text-orange-600">Supprimer mon compte</h2>
          <p className="text-xs text-muted">Suppression définitive et immédiate de toutes vos données. Irréversible.</p>
          <input className="input" type="password" placeholder="Mot de passe" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} required />
          <input className="input" placeholder="Tapez SUPPRIMER" value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} required />
          <button className="btn w-full bg-orange-600 text-white hover:bg-orange-500" type="submit" disabled={del.confirm !== "SUPPRIMER"}>
            Supprimer définitivement
          </button>
        </form>
      </section>
    </div>
  );
}

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-medium text-deep-900">{label}</span>
        <span className="block text-xs text-muted">{help}</span>
      </span>
    </label>
  );
}
