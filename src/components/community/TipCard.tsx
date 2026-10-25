"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Flag, Heart, MessageCircle } from "lucide-react";
import { apiSend } from "@/lib/client/fetcher";
import { DataBadge } from "@/components/ui";
import { formatRelative } from "@/lib/utils/dates";

export type TipView = {
  id: string;
  title: string;
  body: string;
  category: string;
  kind: "experience" | "verified" | "official" | "sponsored";
  sponsorName: string | null;
  sourceUrl: string | null;
  destinationSlug: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  isDemo: boolean;
  createdAt: string | Date;
  verifiedAt: string | Date | null;
  author: { displayName: string; handle: string; avatarColor: string };
  rank?: { score: number; factors: { engagement: number; verification: number; reputation: number; quality: number; reportsPenalty: number; freshness: number; sponsorFactor: number } };
  viewer?: { liked: boolean; saved: boolean; isAuthor: boolean };
};

export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ background: color, width: size, height: size, fontSize: size / 2.4 }} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export const REPORT_REASONS: [string, string][] = [
  ["spam", "Spam ou publicité"],
  ["fraude", "Arnaque / fraude"],
  ["dangereux", "Conseil dangereux"],
  ["faux-avis", "Faux avis"],
  ["sponsorise-non-declare", "Contenu sponsorisé non déclaré"],
  ["offensant", "Contenu offensant"],
  ["autre", "Autre"],
];

export function ReportButton({ targetType, targetId, loggedIn }: { targetType: "tip" | "comment"; targetId: string; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const router = useRouter();
  if (done) return <span className="text-xs text-muted">{done}</span>;
  return (
    <span className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-orange-600"
        onClick={() => (loggedIn ? setOpen((v) => !v) : router.push("/compte/connexion"))}
        aria-expanded={open}
      >
        <Flag size={13} /> Signaler
      </button>
      {open && (
        <span className="card absolute right-0 z-20 mt-1 flex w-60 flex-col p-1 text-left">
          {REPORT_REASONS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              className="rounded-lg px-3 py-1.5 text-left text-sm hover:bg-sage-50"
              onClick={async () => {
                try {
                  const r = await apiSend<{ alreadyReported: boolean }>("/api/community/report", "POST", { targetType, targetId, reason: k });
                  setDone(r.alreadyReported ? "Déjà signalé" : "Merci, la modération va vérifier.");
                } catch (e) {
                  setDone((e as Error).message);
                }
              }}
            >
              {l}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export function TipCard({ tip, categoryLabel, destinationName, loggedIn, compact, asPageTitle }: { tip: TipView; categoryLabel: string; destinationName?: string; loggedIn: boolean; compact?: boolean; asPageTitle?: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(tip.viewer?.liked ?? false);
  const [likes, setLikes] = useState(tip.likeCount);
  const [saved, setSaved] = useState(tip.viewer?.saved ?? false);
  const [err, setErr] = useState("");
  const needLogin = () => router.push(`/compte/connexion?next=/communaute/${tip.id}`);
  return (
    <article className="card space-y-2 p-4" data-testid="tip">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <DataBadge kind={tip.kind} />
        {tip.isDemo && <DataBadge kind="demo" />}
        <span className="chip border-sage-200 bg-white text-muted">{categoryLabel}</span>
        {destinationName && (
          <Link href={`/destinations/${tip.destinationSlug}`} className="text-deep-700 hover:underline">
            {destinationName}
          </Link>
        )}
      </div>
      {asPageTitle ? (
        <h1 className="font-display text-2xl font-bold text-deep-900">{tip.title}</h1>
      ) : (
        <Link href={`/communaute/${tip.id}`} className="block font-display text-lg font-bold text-deep-900 hover:underline">
          {tip.title}
        </Link>
      )}
      <p className={compact ? "line-clamp-3 text-sm text-deep-800" : "whitespace-pre-line text-sm text-deep-800"}>{tip.body}</p>
      {tip.kind === "sponsored" && tip.sponsorName && <p className="text-xs text-violet-800">Contenu sponsorisé par {tip.sponsorName}</p>}
      {tip.sourceUrl && (
        <a href={tip.sourceUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-xs underline">
          Source
        </a>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted">
        <Link href={`/voyageurs/${tip.author.handle}`} className="flex items-center gap-2 hover:text-deep-800">
          <Avatar name={tip.author.displayName} color={tip.author.avatarColor} size={22} /> {tip.author.displayName}
        </Link>
        <span>{formatRelative(new Date(tip.createdAt))}</span>
        {tip.verifiedAt && <span>vérifié {formatRelative(new Date(tip.verifiedAt))}</span>}
        <span className="ml-auto flex items-center gap-3">
          <button
            type="button"
            aria-pressed={liked}
            disabled={tip.viewer?.isAuthor}
            className="inline-flex items-center gap-1 hover:text-orange-600 disabled:opacity-50"
            onClick={async () => {
              if (!loggedIn) return needLogin();
              try {
                const r = await apiSend<{ liked: boolean }>(`/api/community/tips/${tip.id}/like`, "POST");
                setLiked(r.liked);
                setLikes((n) => n + (r.liked ? 1 : -1));
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          >
            <Heart size={14} fill={liked ? "currentColor" : "none"} className={liked ? "text-orange-500" : ""} /> {likes} utile{likes > 1 ? "s" : ""}
          </button>
          <Link href={`/communaute/${tip.id}#commentaires`} className="inline-flex items-center gap-1 hover:text-deep-800">
            <MessageCircle size={14} /> {tip.commentCount}
          </Link>
          <button
            type="button"
            aria-pressed={saved}
            className="inline-flex items-center gap-1 hover:text-deep-800"
            onClick={async () => {
              if (!loggedIn) return needLogin();
              const r = await apiSend<{ saved: boolean }>(`/api/community/tips/${tip.id}/save`, "POST").catch((e) => (setErr(e.message), null));
              if (r) setSaved(r.saved);
            }}
          >
            <Bookmark size={14} fill={saved ? "currentColor" : "none"} /> {saved ? "Enregistré" : "Enregistrer"}
          </button>
          {!tip.viewer?.isAuthor && <ReportButton targetType="tip" targetId={tip.id} loggedIn={loggedIn} />}
        </span>
      </div>
      {tip.rank && !compact && (
        <p className="text-[11px] text-muted" title="Pourquoi ce conseil est classé ici">
          Score d&apos;utilité {tip.rank.score} : engagement {tip.rank.factors.engagement}, vérification {tip.rank.factors.verification}, réputation {tip.rank.factors.reputation}, fraîcheur ×
          {tip.rank.factors.freshness}
          {tip.rank.factors.reportsPenalty ? `, signalements −${tip.rank.factors.reportsPenalty}` : ""}
          {tip.rank.factors.sponsorFactor < 1 ? ", contenu sponsorisé ×0,7" : ""}
        </p>
      )}
      {err && <p className="text-xs text-orange-600">{err}</p>}
    </article>
  );
}
