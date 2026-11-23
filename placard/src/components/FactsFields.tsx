"use client";
import { AUDIENCES, CONDITIONS, type Condition } from "@/lib/listing/constants";
import { CONDITION_LABELS, type Audience } from "@/lib/listing/types";

export type FactsForm = { kind: string; brand: string; size: string; color: string; material: string; audience: Audience; condition: Condition; defects: string; notes: string; purchase: string };

export const EMPTY_FACTS: FactsForm = { kind: "", brand: "", size: "", color: "", material: "", audience: "mixte", condition: "very_good", defects: "", notes: "", purchase: "" };

const AUDIENCE_LABELS: Record<Audience, string> = { mixte: "Non précisé", femme: "Femme", homme: "Homme", enfant: "Enfant" };

export function FactsFields({ value, onChange }: { value: FactsForm; onChange: (next: FactsForm) => void }) {
  const set = <K extends keyof FactsForm>(k: K, v: FactsForm[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="field sm:col-span-2">
        Type d&apos;article
        <input className="input" required maxLength={60} placeholder="veste en jean, sac à main, baskets…" value={value.kind} onChange={(e) => set("kind", e.target.value)} />
      </label>
      <label className="field">
        Marque
        <input className="input" maxLength={60} value={value.brand} onChange={(e) => set("brand", e.target.value)} />
        <span className="hint">Laissez vide si vous n&apos;êtes pas sûr.</span>
      </label>
      <label className="field">
        Taille
        <input className="input" maxLength={30} placeholder="M, 38, 42 EU…" value={value.size} onChange={(e) => set("size", e.target.value)} />
      </label>
      <label className="field">
        Couleur
        <input className="input" maxLength={40} value={value.color} onChange={(e) => set("color", e.target.value)} />
      </label>
      <label className="field">
        Matière
        <input className="input" maxLength={60} placeholder="coton, cuir, laine…" value={value.material} onChange={(e) => set("material", e.target.value)} />
      </label>
      <label className="field">
        Pour
        <select className="input" value={value.audience} onChange={(e) => set("audience", e.target.value as Audience)}>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
          ))}
        </select>
      </label>
      <label className="field">
        État
        <select className="input" value={value.condition} onChange={(e) => set("condition", e.target.value as Condition)}>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
          ))}
        </select>
      </label>
      <label className="field sm:col-span-2">
        Défauts
        <input className="input" maxLength={400} placeholder="petite tache sur la manche, bouton manquant…" value={value.defects} onChange={(e) => set("defects", e.target.value)} />
        <span className="hint">Un défaut annoncé évite un litige avec l&apos;acheteur.</span>
      </label>
      <label className="field sm:col-span-2">
        Autres précisions
        <textarea className="input min-h-20" maxLength={600} placeholder="coupe, mesures, année, histoire de la pièce…" value={value.notes} onChange={(e) => set("notes", e.target.value)} />
      </label>
      <label className="field">
        Prix d&apos;achat (€)
        <input className="input" inputMode="decimal" placeholder="0 si c'était à vous" value={value.purchase} onChange={(e) => set("purchase", e.target.value)} />
        <span className="hint">Sert à calculer votre bénéfice. Jamais affiché dans l&apos;annonce.</span>
      </label>
    </div>
  );
}
