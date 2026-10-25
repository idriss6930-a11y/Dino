"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client/fetcher";
import { ErrorBox, Notice } from "@/components/ui";

export function NewTipForm({ cities, categories, initialDestination }: { cities: { slug: string; name: string }[]; categories: Record<string, string>; initialDestination?: string }) {
  const router = useRouter();
  const [f, setF] = useState({ destinationSlug: initialDestination ?? cities[0]?.slug ?? "", category: "pratique", kind: "experience", title: "", body: "", sponsorName: "", sourceUrl: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card space-y-3 p-4"
      aria-label="Partager un conseil"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await apiSend<{ id: string; status: string; reasons: string[] }>("/api/community/tips", "POST", {
            ...f,
            sponsorName: f.kind === "sponsored" ? f.sponsorName : undefined,
            sourceUrl: f.sourceUrl || undefined,
          });
          if (r.status === "published") router.push(`/communaute/${r.id}`);
          else setPending(`Merci ! Votre conseil sera publié après vérification par la modération (${r.reasons.join(", ")}).`);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="field">
          <span>Destination</span>
          <select className="input" value={f.destinationSlug} onChange={(e) => setF({ ...f, destinationSlug: e.target.value })}>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Catégorie</span>
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {Object.entries(categories).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Nature du conseil</span>
          <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="experience">Expérience personnelle</option>
            <option value="official">Information officielle (source requise, vérifiée)</option>
            <option value="sponsored">Contenu sponsorisé / partenariat</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Titre</span>
        <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} minLength={8} maxLength={120} required />
      </label>
      <label className="field">
        <span>Votre conseil</span>
        <textarea className="input" rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} minLength={40} maxLength={4000} required />
        <small className="text-xs text-muted">Concret et vécu : quand, où, combien. Pas de coordonnées personnelles ni de liens promotionnels non déclarés.</small>
      </label>
      {f.kind === "sponsored" && (
        <label className="field">
          <span>Partenaire / sponsor</span>
          <input className="input" value={f.sponsorName} onChange={(e) => setF({ ...f, sponsorName: e.target.value })} required />
        </label>
      )}
      <label className="field">
        <span>Source (lien, optionnel{f.kind === "official" ? ", requis pour une information officielle" : ""})</span>
        <input className="input" type="url" value={f.sourceUrl} onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} required={f.kind === "official"} />
      </label>
      {error && <ErrorBox message={error} />}
      {pending && <Notice>{pending}</Notice>}
      <button type="submit" className="btn-accent" disabled={busy}>
        Publier
      </button>
    </form>
  );
}
