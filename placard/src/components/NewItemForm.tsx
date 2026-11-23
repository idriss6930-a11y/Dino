"use client";
import { useState } from "react";
import { apiSend } from "@/lib/client/fetcher";
import { uploadPhoto } from "@/lib/client/photos";
import { parseEurToCents } from "@/lib/utils/money";
import { EMPTY_FACTS, FactsFields, type FactsForm } from "./FactsFields";
import { PhotoPicker } from "./PhotoPicker";
import { ErrorBox } from "./ui";

export function factsPayload(f: FactsForm) {
  const { purchase, ...rest } = f;
  return { ...rest, purchaseCents: parseEurToCents(purchase) };
}

export function NewItemForm({ ai }: { ai: boolean }) {
  const [facts, setFacts] = useState<FactsForm>(EMPTY_FACTS);
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let id = "";
    try {
      setStep("Création de l'article…");
      ({ id } = await apiSend<{ id: string }>("/api/items", "POST", factsPayload(facts)));
      for (const [i, file] of files.entries()) {
        setStep(`Envoi de la photo ${i + 1} sur ${files.length}…`);
        await uploadPhoto(id, file);
      }
      setStep(ai ? "Rédaction de l'annonce… cela peut prendre jusqu'à une minute." : "Rédaction de l'annonce…");
      await apiSend(`/api/items/${id}/generate`, "POST");
      window.location.href = `/app/articles/${id}`;
    } catch (err) {
      // L'article existe peut-être déjà : on y va plutôt que de laisser recommencer (et de consommer le quota).
      if (id) window.location.href = `/app/articles/${id}?probleme=${encodeURIComponent((err as Error).message)}`;
      else {
        setError((err as Error).message);
        setStep("");
      }
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-bold">1. Les photos</h2>
        <p className="mt-1 mb-3 text-sm text-muted">{ai ? "L'IA les regarde pour décrire l'article et repérer les défauts visibles." : "Elles seront jointes à l'annonce."}</p>
        <PhotoPicker files={files} onChange={setFiles} />
      </section>
      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-bold">2. Ce que vous savez de l&apos;article</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Seul le type d&apos;article est obligatoire. Plus vous en dites, plus l&apos;annonce est juste.</p>
        <FactsFields value={facts} onChange={setFacts} />
      </section>
      <ErrorBox message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-accent" disabled={Boolean(step)}>Rédiger l&apos;annonce</button>
        <span role="status" className="text-sm text-muted">{step}</span>
      </div>
    </form>
  );
}
