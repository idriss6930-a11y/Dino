"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import type { AssistantReply } from "@/lib/ai/assistant";
import type { ToolCard } from "@/lib/ai/tools";
import { apiSend } from "@/lib/client/fetcher";
import { Dino } from "./Dino";
import { DataBadge, type DataKind } from "./ui";

type Msg = { role: "user"; content: string } | { role: "assistant"; content: string; reply: AssistantReply };

const EXAMPLES = [
  "Je veux partir 5 jours en avril, au soleil, avec 600 euros, au départ de Lyon",
  "Est-ce une bonne idée de partir au Japon en août ?",
  "Quel est le meilleur mois pour aller à Lisbonne en payant moins cher et en évitant les touristes ?",
  "Je veux une destination romantique, peu fréquentée et accessible en moins de trois heures de vol depuis Paris",
  "Quel est le coût total réel de 7 nuits à Marrakech pour 2 personnes ?",
];

const SECTION_KIND: Record<string, DataKind> = { "Faits vérifiés": "fait", Estimations: "estimation", Prévisions: "prevision", Recommandations: "experience" };

export function AssistantChat({ aiEnabled }: { aiEnabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: content.trim() }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setError("");
    try {
      const reply = await apiSend<AssistantReply>("/api/assistant", "POST", {
        messages: next.slice(-10).map((m) => ({ role: m.role, content: m.role === "assistant" ? summarize(m.reply) : m.content })),
      });
      setMsgs([...next, { role: "assistant", content: summarize(reply), reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-deep-900 sm:text-3xl">Assistant DINO</h1>
      <div className="flex items-start gap-3 rounded-2xl bg-sage-50 p-4 text-sm">
        <Dino mood="happy" size={48} />
        <div>
          <p className="font-semibold text-deep-900">Bonjour, je suis DINO !</p>
          <p className="text-deep-800">
            Décris ton envie de voyage en une phrase. Je sépare toujours les faits, les estimations, les prévisions et mes recommandations.
            {!aiEnabled && " (Mode sans IA : j'utilise mon analyse automatique, plus limitée. Ajoutez une clé ANTHROPIC_API_KEY côté serveur pour la conversation complète.)"}
          </p>
        </div>
      </div>
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="chip border-sage-200 bg-white py-2 text-left text-deep-800 hover:bg-sage-50" onClick={() => send(e)}>
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-4" aria-live="polite">
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-deep-800 px-4 py-2 text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="flex gap-3" data-testid="assistant-reply">
              <Dino mood={m.reply.cards.length ? "explorer" : "thinking"} size={40} className="shrink-0" />
              <div className="card min-w-0 flex-1 space-y-3 p-4">
                {m.reply.parsed && m.reply.parsed.recognized.length > 0 && (
                  <p className="text-xs text-muted">J&apos;ai compris : {m.reply.parsed.recognized.join(" · ")}</p>
                )}
                {m.reply.sections.map((s) => (
                  <div key={s.title}>
                    <p className="mb-1 flex items-center gap-2 font-display font-bold text-deep-900">
                      {s.title} <DataBadge kind={SECTION_KIND[s.title] ?? "fait"} />
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-deep-800">
                      {s.items.map((x, j) => (
                        <li key={j}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {m.reply.cards.map((c, j) => (
                  <CardView key={j} card={c} />
                ))}
                {m.reply.uncertainties.length > 0 && <p className="text-xs text-muted">Incertitudes : {m.reply.uncertainties.join(" ")}</p>}
                <p className="text-[11px] text-muted">
                  {m.reply.mode === "ia" ? `Réponse IA (${m.reply.model ?? "Claude"})` : "Analyse automatique DINO (sans IA)"}
                  {m.reply.toolsUsed.length ? ` · outils : ${m.reply.toolsUsed.join(", ")}` : ""}
                </p>
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <Dino mood="thinking" size={40} className="animate-pulse" /> DINO réfléchit et consulte ses outils…
          </div>
        )}
        {error && <p className="text-sm text-orange-600">{error}</p>}
        <div ref={end} />
      </div>
      <form
        className="sticky bottom-20 flex gap-2 rounded-full border border-sage-200 bg-white p-1.5 shadow-[var(--shadow-soft)] lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label htmlFor="ask" className="sr-only">
          Votre question
        </label>
        <input id="ask" className="min-w-0 flex-1 rounded-full px-4 outline-none" placeholder="Ex. un week-end romantique en mai pour 400 € depuis Bordeaux" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button type="submit" className="btn-accent" disabled={busy || !text.trim()} aria-label="Envoyer">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function summarize(r: AssistantReply) {
  return r.text ?? r.sections.map((s) => `## ${s.title}\n${s.items.map((i) => `- ${i}`).join("\n")}`).join("\n");
}

function CardView({ card }: { card: ToolCard }) {
  if (card.type === "destinations")
    return (
      <div className="rounded-xl bg-sage-50 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {card.items.map((d) => (
            <Link key={d.slug} href={`/destinations/${d.slug}`} className="rounded-lg bg-white p-3 text-sm hover:ring-1 hover:ring-sage-300">
              <p className="font-semibold">
                {d.name} <span className="text-xs text-muted">{d.country}</span>
              </p>
              <p className="text-xs text-muted">
                {d.month} · ≈ {d.perPerson} / pers.
              </p>
              <p className="mt-1 text-xs">{d.reasons.slice(0, 2).join(" · ")}</p>
              {d.warnings.length > 0 && <p className="text-xs text-orange-600">{d.warnings.join(" · ")}</p>}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">{card.note}</p>
      </div>
    );
  if (card.type === "flights" || card.type === "hotels")
    return (
      <div className="rounded-xl bg-sage-50 p-3 text-sm">
        <ul className="space-y-1">
          {card.items.map((x, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
              <span>{"summary" in x ? x.summary : `${x.name} · ${x.rating} · ${x.value}`}</span>
              <span className="flex items-center gap-2 font-semibold">
                {x.price} {x.isDemo && <DataBadge kind="demo" />}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted">{card.note}</p>
        <Link className="btn-link text-xs" href={card.link}>
          Ouvrir la recherche complète
        </Link>
      </div>
    );
  if (card.type === "insight")
    return (
      <div className="rounded-xl bg-sky-50 p-3 text-sm">
        <p className="font-semibold">{card.recommendation}</p>
        <p className="text-xs">
          {card.verdict} · confiance {card.confidence}
        </p>
        <p className="text-[11px] text-muted">{card.note}</p>
        <Link className="btn-link text-xs" href={card.link}>
          Voir l&apos;analyse de prix
        </Link>
      </div>
    );
  if (card.type === "season")
    return (
      <div className="rounded-xl bg-sage-50 p-3 text-sm">
        <p className="font-semibold">{card.name}</p>
        <p className="text-xs">
          Météo : {card.best.weather.join(", ")} · Prix bas : {card.best.price.join(", ")} · Calme : {card.best.crowd.join(", ")}
        </p>
        <p className="text-xs">{card.cheapQuiet}</p>
        {card.month && (
          <p className="text-xs">
            {card.month.name} : météo {card.month.weather}/100, prix {card.month.price}/100, calme {card.month.crowd}/100. {card.month.pros.join(", ")} {card.month.cons.length ? `— ${card.month.cons.join(", ")}` : ""}
          </p>
        )}
        <p className="text-[11px] text-muted">{card.source}</p>
        <Link className="btn-link text-xs" href={`/destinations/${card.slug}`}>
          Calendrier complet
        </Link>
      </div>
    );
  return (
    <div className="rounded-xl bg-amber-50 p-3 text-sm">
      <p className="font-semibold">Budget : {card.name}</p>
      <ul className="text-xs">
        {card.scenarios.map((s) => (
          <li key={s.name}>
            {s.name} : {s.total} ({s.perPerson} / pers.)
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted">{card.note}</p>
      <Link className="btn-link text-xs" href={`/budget?destination=${card.slug}`}>
        Détail du budget
      </Link>
    </div>
  );
}
