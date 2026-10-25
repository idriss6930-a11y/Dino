"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { BellRing, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { apiGet, apiSend } from "@/lib/client/fetcher";
import { PlaceInput } from "./PlaceInput";
import { Dino, type DinoMood } from "./Dino";
import { DataBadge, Notice } from "./ui";
import { formatMoney } from "@/lib/utils/money";
import { formatRelative } from "@/lib/utils/dates";

type Channels = { inApp: boolean; email: boolean; push: boolean };
type AlertRow = {
  id: string;
  kind: "route" | "flexible" | "hotel" | "budget" | "deal";
  name: string;
  maxPriceCents: number | null;
  dropPct: number | null;
  currency: string;
  checkEveryMinutes: number;
  channels: Channels;
  active: boolean;
  lastPriceCents: number | null;
  referencePriceCents: number | null;
  lastCheckedAt: string | null;
  lastNotifiedAt: string | null;
  lastError: string | null;
  events: { id: string; priceCents: number; changePct: number | null; reason: string; isDemo: boolean; createdAt: string }[];
};
type Notif = { id: string; title: string; body: string; link: string | null; mascot: string; readAt: string | null; createdAt: string; delivery: Record<string, string> };

const KINDS = {
  route: "Itinéraire et dates précises",
  flexible: "Itinéraire, dates flexibles (mois)",
  hotel: "Hôtel ou ville",
  budget: "Budget : où partir sous X €",
  deal: "Bons plans exceptionnels depuis mon aéroport",
};

export function AlertsManager({
  initialAlerts,
  initialNotifications,
  cities,
  plan,
  limits,
  pushAvailable,
  emailAvailable,
  vapidKey,
}: {
  initialAlerts: AlertRow[];
  initialNotifications: Notif[];
  cities: { slug: string; name: string }[];
  plan: string;
  limits: { maxAlerts: number; minIntervalMinutes: number };
  pushAvailable: boolean;
  emailAvailable: boolean;
  vapidKey: string | null;
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [notifs, setNotifs] = useState(initialNotifications);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const r = await apiGet<{ alerts: AlertRow[] }>("/api/alerts");
    setAlerts(r.alerts);
    const n = await apiGet<{ notifications: Notif[] }>("/api/notifications");
    setNotifs(n.notifications);
  }

  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) throw new Error("Votre navigateur ne prend pas en charge les notifications push.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Autorisation refusée par le navigateur.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
      await apiSend("/api/push", "POST", sub.toJSON());
      setMsg("Notifications push activées sur cet appareil.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <NewAlertForm cities={cities} onCreated={async (note) => (setMsg(note), await reload())} />
        {msg && <Notice>{msg}</Notice>}
        <h2 className="section-title">
          Mes alertes <span className="text-sm font-normal text-muted">({alerts.length}/{limits.maxAlerts}, formule {plan === "premium" ? "Premium" : "gratuite"})</span>
        </h2>
        {alerts.length === 0 && <p className="text-sm text-muted">Aucune alerte pour le moment.</p>}
        {alerts.map((a) => (
          <article key={a.id} className={clsx("card space-y-2 p-4", !a.active && "opacity-70")} data-testid="alert">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold text-deep-900">{a.name}</p>
                <p className="text-xs text-muted">
                  {KINDS[a.kind]} · {a.maxPriceCents ? `sous ${formatMoney(a.maxPriceCents, a.currency)}` : ""} {a.dropPct ? `· baisse ≥ ${a.dropPct} %` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <IconBtn
                  label="Vérifier maintenant"
                  busy={busyId === a.id}
                  onClick={async () => {
                    setBusyId(a.id);
                    try {
                      const r = await apiSend<{ status: string; reason?: string }>(`/api/alerts/${a.id}/check`, "POST");
                      setMsg(r.status === "notified" ? "Une variation intéressante a été trouvée : voir les notifications." : `Vérifié : ${r.reason ?? "pas de changement notable."}`);
                      await reload();
                    } catch (e) {
                      setMsg((e as Error).message);
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <RefreshCw size={16} />
                </IconBtn>
                <IconBtn label={a.active ? "Mettre en pause" : "Réactiver"} onClick={async () => (await apiSend(`/api/alerts/${a.id}`, "PATCH", { active: !a.active }), reload())}>
                  {a.active ? <Pause size={16} /> : <Play size={16} />}
                </IconBtn>
                <IconBtn label="Supprimer" onClick={async () => (await apiSend(`/api/alerts/${a.id}`, "DELETE"), reload())}>
                  <Trash2 size={16} />
                </IconBtn>
              </div>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <p>
                <span className="text-muted">Dernier prix vu : </span>
                {a.lastPriceCents ? formatMoney(a.lastPriceCents, a.currency) : "—"}
              </p>
              <p>
                <span className="text-muted">Vérifiée : </span>
                {a.lastCheckedAt ? formatRelative(new Date(a.lastCheckedAt)) : "pas encore"} · toutes les {Math.round(a.checkEveryMinutes / 60)} h
              </p>
              <p>
                <span className="text-muted">Canaux : </span>
                {(["inApp", "email", "push"] as const).map((c) => (
                  <label key={c} className="mr-2 inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={a.channels[c]}
                      disabled={c === "inApp" || (c === "email" && !emailAvailable) || (c === "push" && !pushAvailable)}
                      onChange={async (e) => (await apiSend(`/api/alerts/${a.id}`, "PATCH", { channels: { ...a.channels, [c]: e.target.checked } }), reload())}
                    />
                    {c === "inApp" ? "appli" : c === "email" ? "e-mail" : "push"}
                  </label>
                ))}
              </p>
            </div>
            {a.lastError && <p className="text-xs text-orange-600">Dernière erreur : {a.lastError}</p>}
            {a.events.length > 0 && (
              <ul className="space-y-1 border-t border-sage-100 pt-2 text-xs">
                {a.events.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{formatMoney(e.priceCents, a.currency)}</span>
                    {e.changePct != null && <span className={e.changePct < 0 ? "text-deep-700" : "text-orange-600"}>{e.changePct > 0 ? "+" : ""}{Math.round(e.changePct)} %</span>}
                    <span className="text-muted">{e.reason}</span>
                    {e.isDemo && <DataBadge kind="demo" />}
                    <span className="ml-auto text-muted">{formatRelative(new Date(e.createdAt))}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
        <Notice>
          Fréquence réelle : votre formule permet une vérification au plus toutes les {Math.round(limits.minIntervalMinutes / 60)} h, et chaque source impose son propre minimum. DINO ne vous notifie pas deux fois pour le même prix, attend 12 h entre deux notifications d&apos;une même alerte, et respecte votre plafond quotidien (réglable dans{" "}
          <Link className="underline" href="/compte">
            Mon compte
          </Link>
          ).
        </Notice>
      </div>

      <aside id="notifications" className="space-y-3">
        <div className="flex items-center gap-2">
          <BellRing className="text-orange-500" />
          <h2 className="section-title flex-1">Notifications</h2>
          <button type="button" className="btn-link text-xs" onClick={async () => (await apiSend("/api/notifications", "POST"), reload())}>
            Tout marquer comme lu
          </button>
        </div>
        <div className="card space-y-1 p-3 text-xs">
          <p>
            Appli : <strong>activé</strong> · E-mail : <strong>{emailAvailable ? "disponible" : "non configuré sur ce serveur"}</strong> · Push : <strong>{pushAvailable ? "disponible" : "non configuré sur ce serveur"}</strong>
          </p>
          {pushAvailable && (
            <button type="button" className="btn-ghost mt-1" onClick={enablePush}>
              Activer le push sur cet appareil
            </button>
          )}
        </div>
        {notifs.length === 0 && <p className="text-sm text-muted">Aucune notification.</p>}
        {notifs.map((n) => (
          <div key={n.id} className={clsx("card flex gap-3 p-3 text-sm", !n.readAt && "border-orange-400")}>
            <Dino mood={(n.mascot as DinoMood) ?? "happy"} size={36} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{n.title}</p>
              <p className="whitespace-pre-line text-xs text-deep-800">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted">
                {formatRelative(new Date(n.createdAt))}
                {n.link && (
                  <>
                    {" · "}
                    <Link className="underline" href={n.link}>
                      Voir
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function IconBtn({ label, onClick, children, busy }: { label: string; onClick: () => void; children: React.ReactNode; busy?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={busy} className="rounded-full p-2 text-deep-700 hover:bg-sage-100 disabled:animate-spin" onClick={onClick}>
      {children}
    </button>
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function NewAlertForm({ cities, onCreated }: { cities: { slug: string; name: string }[]; onCreated: (note: string) => void }) {
  const [kind, setKind] = useState<keyof typeof KINDS>("route");
  const [origin, setOrigin] = useState({ code: "PAR", label: "Paris (tous les aéroports)" });
  const [destination, setDestination] = useState({ code: "", label: "" });
  const [f, setF] = useState({ departDate: "", returnDate: "", departMonth: "", tripNights: "7", citySlug: cities[0]?.slug ?? "", checkin: "", checkout: "", budget: "", nights: "5", maxPrice: "", dropPct: "10", passengers: "1", email: false, push: false });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });
  return (
    <form
      className="card space-y-3 p-4"
      aria-label="Nouvelle alerte"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const criteria: Record<string, unknown> = { passengers: Number(f.passengers) };
        if (kind === "route") Object.assign(criteria, { origin: origin.code, destination: destination.code, departDate: f.departDate, returnDate: f.returnDate || undefined });
        if (kind === "flexible") Object.assign(criteria, { origin: origin.code, destination: destination.code, departMonth: f.departMonth, tripNights: Number(f.tripNights) });
        if (kind === "hotel") Object.assign(criteria, { citySlug: f.citySlug, checkin: f.checkin, checkout: f.checkout });
        if (kind === "budget") Object.assign(criteria, { origin: origin.code, budget: Number(f.budget), nights: Number(f.nights) });
        if (kind === "deal") Object.assign(criteria, { origin: origin.code });
        try {
          const r = await apiSend<{ checkEveryMinutes: number; note?: string }>("/api/alerts", "POST", {
            kind,
            criteria,
            maxPrice: f.maxPrice ? Number(f.maxPrice) : undefined,
            dropPct: f.dropPct ? Number(f.dropPct) : undefined,
            channels: { inApp: true, email: f.email, push: f.push },
          });
          onCreated(`Alerte créée. Vérification toutes les ${Math.round(r.checkEveryMinutes / 60)} h.${r.note ? ` ${r.note}` : ""}`);
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <h2 className="font-display text-lg font-bold">Nouvelle alerte</h2>
      <label className="field">
        <span>Type d&apos;alerte</span>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as keyof typeof KINDS)}>
          {Object.entries(KINDS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {kind !== "hotel" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <PlaceInput name="alert-origin" label="Départ" value={origin} onChange={setOrigin} />
          {(kind === "route" || kind === "flexible") && <PlaceInput name="alert-destination" label="Destination" value={destination} onChange={setDestination} />}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {kind === "route" && (
          <>
            <Field label="Aller" type="date" value={f.departDate} onChange={(v) => set("departDate", v)} required />
            <Field label="Retour (optionnel)" type="date" value={f.returnDate} onChange={(v) => set("returnDate", v)} />
          </>
        )}
        {kind === "flexible" && (
          <>
            <Field label="Mois de départ" type="month" value={f.departMonth} onChange={(v) => set("departMonth", v)} required />
            <Field label="Durée (nuits)" type="number" value={f.tripNights} onChange={(v) => set("tripNights", v)} />
          </>
        )}
        {kind === "hotel" && (
          <>
            <label className="field">
              <span>Ville</span>
              <select className="input" value={f.citySlug} onChange={(e) => set("citySlug", e.target.value)}>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Arrivée" type="date" value={f.checkin} onChange={(v) => set("checkin", v)} required />
            <Field label="Départ" type="date" value={f.checkout} onChange={(v) => set("checkout", v)} required />
          </>
        )}
        {kind === "budget" && (
          <>
            <Field label="Budget par personne (€)" type="number" value={f.budget} onChange={(v) => set("budget", v)} required />
            <Field label="Nuits" type="number" value={f.nights} onChange={(v) => set("nights", v)} />
          </>
        )}
        {kind !== "budget" && kind !== "deal" && (
          <>
            <Field label="Prix max (€, optionnel)" type="number" value={f.maxPrice} onChange={(v) => set("maxPrice", v)} />
            <Field label="Baisse minimale (%)" type="number" value={f.dropPct} onChange={(v) => set("dropPct", v)} />
          </>
        )}
        {kind !== "hotel" && <Field label="Voyageurs" type="number" value={f.passengers} onChange={(v) => set("passengers", v)} />}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted">Me prévenir aussi par :</span>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={f.email} onChange={(e) => set("email", e.target.checked)} /> e-mail
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={f.push} onChange={(e) => set("push", e.target.checked)} /> push
        </label>
        <button type="submit" className="btn-accent ml-auto">
          Créer l&apos;alerte
        </button>
      </div>
      {error && <p className="text-sm text-orange-600" role="alert">{error}</p>}
    </form>
  );
}

function Field({ label, type, value, onChange, required }: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
