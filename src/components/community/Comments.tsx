"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client/fetcher";
import { formatRelative } from "@/lib/utils/dates";
import { Avatar, ReportButton } from "./TipCard";

type C = { id: string; parentId: string | null; body: string; createdAt: string; author: { displayName: string; handle: string; avatarColor: string } };

export function Comments({ tipId, comments, loggedIn }: { tipId: string; comments: C[]; loggedIn: boolean }) {
  const router = useRouter();
  const roots = comments.filter((c) => !c.parentId);
  return (
    <section id="commentaires" className="space-y-3">
      <h2 className="section-title">Commentaires ({comments.length})</h2>
      {loggedIn ? <CommentBox tipId={tipId} onDone={() => router.refresh()} /> : <p className="text-sm text-muted">Connectez-vous pour commenter.</p>}
      {roots.map((c) => (
        <div key={c.id} className="space-y-2">
          <CommentItem c={c} loggedIn={loggedIn} tipId={tipId} canReply onDone={() => router.refresh()} />
          <div className="ml-8 space-y-2 border-l-2 border-sage-100 pl-4">
            {comments
              .filter((r) => r.parentId === c.id)
              .map((r) => (
                <CommentItem key={r.id} c={r} loggedIn={loggedIn} tipId={tipId} onDone={() => router.refresh()} />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function CommentItem({ c, loggedIn, tipId, canReply, onDone }: { c: C; loggedIn: boolean; tipId: string; canReply?: boolean; onDone: () => void }) {
  const [reply, setReply] = useState(false);
  return (
    <div className="card p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted">
        <Avatar name={c.author.displayName} color={c.author.avatarColor} size={22} />
        <span className="font-medium text-deep-900">{c.author.displayName}</span>
        <span>{formatRelative(new Date(c.createdAt))}</span>
        <span className="ml-auto flex gap-3">
          {canReply && loggedIn && (
            <button type="button" className="hover:text-deep-800" onClick={() => setReply((v) => !v)}>
              Répondre
            </button>
          )}
          <ReportButton targetType="comment" targetId={c.id} loggedIn={loggedIn} />
        </span>
      </div>
      <p className="whitespace-pre-line">{c.body}</p>
      {reply && <CommentBox tipId={tipId} parentId={c.id} onDone={() => (setReply(false), onDone())} />}
    </div>
  );
}

function CommentBox({ tipId, parentId, onDone }: { tipId: string; parentId?: string; onDone: () => void }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await apiSend(`/api/community/tips/${tipId}/comments`, "POST", { body, parentId });
          setBody("");
          onDone();
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <textarea className="input" rows={2} maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)} placeholder={parentId ? "Votre réponse" : "Votre commentaire"} required minLength={2} aria-label={parentId ? "Votre réponse" : "Votre commentaire"} />
      <button type="submit" className="btn-primary self-end">
        Envoyer
      </button>
      {error && <p className="text-xs text-orange-600">{error}</p>}
    </form>
  );
}
