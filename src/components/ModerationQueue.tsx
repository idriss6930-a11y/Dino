"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client/fetcher";
import { ErrorBox } from "./ui";

type Tip = { id: string; title: string; body: string; kind: string; moderationNote: string | null; reportCount: number; createdAt: string; sourceUrl: string | null };
type Report = { id: string; targetType: string; targetId: string; reason: string; details: string; createdAt: string };

export function ModerationQueue({ pending, reports }: { pending: Tip[]; reports: Report[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const act = async (tipId: string, action: "approve" | "hide" | "verify" | "mark_official") => {
    try {
      await apiSend("/api/moderation", "POST", { tipId, action });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <h2 className="section-title">En attente ({pending.length})</h2>
        {error && <ErrorBox message={error} />}
        {pending.length === 0 && <p className="text-sm text-muted">Rien à modérer.</p>}
        {pending.map((t) => (
          <article key={t.id} className="card space-y-2 p-4 text-sm">
            <p className="font-display text-lg font-bold">{t.title}</p>
            <p className="whitespace-pre-line">{t.body}</p>
            {t.sourceUrl && (
              <a className="text-xs underline" href={t.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                {t.sourceUrl}
              </a>
            )}
            <p className="text-xs text-orange-600">Motif : {t.moderationNote ?? "—"} · signalements : {t.reportCount}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={() => act(t.id, "approve")}>
                Publier
              </button>
              <button type="button" className="btn-ghost" onClick={() => act(t.id, "verify")}>
                Publier comme vérifié
              </button>
              <button type="button" className="btn-ghost" onClick={() => act(t.id, "mark_official")}>
                Source officielle confirmée
              </button>
              <button type="button" className="btn bg-orange-500 text-white" onClick={() => act(t.id, "hide")}>
                Masquer
              </button>
            </div>
          </article>
        ))}
      </section>
      <aside className="space-y-3">
        <h2 className="section-title">Signalements ouverts ({reports.length})</h2>
        {reports.map((r) => (
          <div key={r.id} className="card p-3 text-xs">
            <p className="font-semibold">
              {r.targetType === "tip" ? "Conseil" : "Commentaire"} · {r.reason}
            </p>
            {r.details && <p>{r.details}</p>}
            {r.targetType === "tip" && (
              <div className="mt-2 flex gap-2">
                <a className="underline" href={`/communaute/${r.targetId}`}>
                  Voir
                </a>
                <button type="button" className="underline" onClick={() => act(r.targetId, "approve")}>
                  Rejeter le signalement
                </button>
                <button type="button" className="text-orange-600 underline" onClick={() => act(r.targetId, "hide")}>
                  Masquer le conseil
                </button>
              </div>
            )}
          </div>
        ))}
      </aside>
    </div>
  );
}
