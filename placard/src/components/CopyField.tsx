"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <div className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</div>
        <div className={multiline ? "mt-1 text-sm break-words whitespace-pre-wrap" : "mt-1 text-sm break-words"}>{value}</div>
        {state === "failed" && <div className="mt-1 text-xs text-tag-700">Copie impossible : sélectionnez le texte à la main.</div>}
      </div>
      <button type="button" className="btn-ghost shrink-0 px-3" onClick={copy} aria-label={`Copier : ${label}`}>
        {state === "done" ? <Check size={16} aria-hidden className="text-leaf-700" /> : <Copy size={16} aria-hidden />}
        <span aria-live="polite">{state === "done" ? "Copié" : "Copier"}</span>
      </button>
    </div>
  );
}
