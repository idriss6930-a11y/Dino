import clsx from "clsx";
import type { ReactNode } from "react";
import { Dino, type DinoMood } from "./Dino";

export type DataKind = "demo" | "test" | "live" | "cached" | "estimation" | "prevision" | "fait" | "editorial" | "sponsored" | "official" | "verified" | "experience";

const DATA_BADGES: Record<DataKind, { label: string; cls: string; title: string }> = {
  demo: { label: "Démo", cls: "border-orange-400 bg-orange-400/10 text-orange-600", title: "Données de démonstration générées par DINO : ce ne sont pas de vrais tarifs." },
  test: { label: "Bac à sable", cls: "border-orange-400 bg-orange-400/10 text-orange-600", title: "Données de test d'un fournisseur réel (environnement sandbox), non réservables." },
  live: { label: "En direct", cls: "border-sage-500 bg-sage-100 text-deep-800", title: "Prix obtenu en temps réel auprès du fournisseur." },
  cached: { label: "Prix en cache", cls: "border-sage-400 bg-sage-50 text-deep-700", title: "Prix observé récemment par le fournisseur, à confirmer au moment de réserver." },
  estimation: { label: "Estimation", cls: "border-amber-400 bg-amber-50 text-amber-800", title: "Ordre de grandeur calculé par DINO, pas un prix réel." },
  prevision: { label: "Prévision", cls: "border-sky-300 bg-sky-50 text-sky-800", title: "Tendance probabiliste, jamais une garantie." },
  fait: { label: "Fait", cls: "border-sage-500 bg-sage-100 text-deep-800", title: "Donnée renvoyée par une source." },
  editorial: { label: "Indicatif", cls: "border-sage-300 bg-white text-muted", title: "Valeur éditoriale indicative, à confirmer." },
  sponsored: { label: "Sponsorisé", cls: "border-violet-300 bg-violet-50 text-violet-800", title: "Contenu payé, déclaré comme tel." },
  official: { label: "Officiel", cls: "border-sky-400 bg-sky-50 text-sky-800", title: "Information issue d'une source officielle." },
  verified: { label: "Vérifié", cls: "border-sage-500 bg-sage-100 text-deep-800", title: "Information revérifiée récemment par la modération." },
  experience: { label: "Expérience", cls: "border-sage-200 bg-cream-100 text-deep-700", title: "Vécu personnel d'un voyageur." },
};

export function DataBadge({ kind, className }: { kind: DataKind; className?: string }) {
  const b = DATA_BADGES[kind];
  return (
    <span className={clsx("chip", b.cls, className)} title={b.title}>
      {b.label}
    </span>
  );
}

export function sourceKind(source: { isDemo: boolean; freshness: string; id?: string }): DataKind {
  if (source.isDemo) return source.id?.startsWith("demo") ? "demo" : "test";
  return source.freshness === "live" ? "live" : "cached";
}

export function EmptyState({ mood = "thinking", title, children }: { mood?: DinoMood; title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <Dino mood={mood} size={88} />
      <p className="font-display text-lg font-bold text-deep-900">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-orange-400 bg-orange-400/10 p-4 text-sm text-orange-600">
      <Dino mood="surprised" size={40} />
      <p className="pt-2">{message}</p>
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={clsx("rounded-xl border px-3 py-2 text-xs", tone === "warn" ? "border-orange-400/60 bg-orange-400/10 text-orange-600" : "border-sage-200 bg-sage-50 text-deep-700")}>
      {children}
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm text-muted" role="status">
      <Dino mood="explorer" size={48} className="animate-bounce" />
      {label}
    </div>
  );
}

export function PageHeader({ title, subtitle, mood, children }: { title: string; subtitle?: ReactNode; mood?: DinoMood; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      {mood && <Dino mood={mood} size={64} />}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold text-deep-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function ScoreBar({ value, label, tone = "sage" }: { value: number; label: string; tone?: "sage" | "orange" | "sky" }) {
  const color = { sage: "bg-sage-500", orange: "bg-orange-500", sky: "bg-sky-500" }[tone];
  return (
    <div className="flex items-center gap-2 text-xs" title={`${label} : ${value}/100`}>
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-sage-100" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${Math.max(3, value)}%` }} />
      </div>
      <span className="w-7 text-right tabular-nums text-deep-800">{value}</span>
    </div>
  );
}
