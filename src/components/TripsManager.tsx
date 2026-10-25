"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiSend } from "@/lib/client/fetcher";
import { ErrorBox } from "./ui";
import { formatMoney } from "@/lib/utils/money";

type Trip = { id: string; title: string; destinationSlug: string | null; startDate: string | null; endDate: string | null; budgetCents: number | null; notes: string };
type Saved = { id: string; kind: string; label: string; params: Record<string, string> };

export function TripsManager({ trips, searches, wishlist, cities }: { trips: Trip[]; searches: Saved[]; wishlist: { slug: string; name: string }[]; cities: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({ title: "", destinationSlug: "", startDate: "", endDate: "", budget: "", notes: "" });
  const [error, setError] = useState("");
  const del = async (url: string) => {
    await apiSend(url, "DELETE").catch((e) => setError(e.message));
    router.refresh();
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <form
          className="card grid gap-3 p-4 sm:grid-cols-2"
          aria-label="Nouveau voyage"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await apiSend("/api/trips", "POST", { ...f, destinationSlug: f.destinationSlug || null, startDate: f.startDate || null, endDate: f.endDate || null, budget: f.budget ? Number(f.budget) : null });
              setF({ title: "", destinationSlug: "", startDate: "", endDate: "", budget: "", notes: "" });
              router.refresh();
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <h2 className="font-display text-lg font-bold sm:col-span-2">Nouveau voyage</h2>
          <label className="field">
            <span>Nom</span>
            <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required minLength={2} />
          </label>
          <label className="field">
            <span>Destination</span>
            <select className="input" value={f.destinationSlug} onChange={(e) => setF({ ...f, destinationSlug: e.target.value })}>
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Du</span>
            <input className="input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
          </label>
          <label className="field">
            <span>Au</span>
            <input className="input" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
          </label>
          <label className="field">
            <span>Budget (€)</span>
            <input className="input" inputMode="numeric" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value.replace(/[^\d]/g, "") })} />
          </label>
          <label className="field">
            <span>Notes</span>
            <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={4000} />
          </label>
          <button type="submit" className="btn-primary sm:col-span-2">
            Enregistrer le voyage
          </button>
        </form>
        {error && <ErrorBox message={error} />}
        {trips.map((t) => (
          <div key={t.id} className="card flex items-start gap-3 p-4 text-sm">
            <div className="flex-1">
              <p className="font-display text-lg font-bold">{t.title}</p>
              <p className="text-xs text-muted">
                {t.destinationSlug && (
                  <Link className="underline" href={`/destinations/${t.destinationSlug}`}>
                    {cities.find((c) => c.slug === t.destinationSlug)?.name}
                  </Link>
                )}{" "}
                {t.startDate ?? ""} {t.endDate ? `→ ${t.endDate}` : ""} {t.budgetCents ? `· budget ${formatMoney(t.budgetCents, "EUR")}` : ""}
              </p>
              {t.notes && <p className="mt-1">{t.notes}</p>}
            </div>
            <button type="button" aria-label={`Supprimer ${t.title}`} className="text-muted hover:text-orange-600" onClick={() => del(`/api/trips/${t.id}`)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <aside className="space-y-4">
        <div className="card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Recherches enregistrées</h2>
          {searches.length === 0 && <p className="text-sm text-muted">Aucune. Utilisez « Enregistrer » sur une recherche de vols.</p>}
          <ul className="space-y-1 text-sm">
            {searches.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Link className="flex-1 underline" href={`/${s.kind === "hotel" ? "hotels" : "vols"}?${new URLSearchParams(s.params)}`}>
                  {s.label}
                </Link>
                <button type="button" aria-label={`Supprimer ${s.label}`} className="text-muted hover:text-orange-600" onClick={() => del(`/api/saved-searches/${s.id}`)}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Mes envies</h2>
          {wishlist.length === 0 && <p className="text-sm text-muted">Ajoutez des destinations avec « J&apos;aimerais y aller ».</p>}
          <ul className="space-y-1 text-sm">
            {wishlist.map((w) => (
              <li key={w.slug}>
                <Link className="underline" href={`/destinations/${w.slug}`}>
                  {w.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
