/**
 * Communauté DINO : conseils, commentaires, likes, favoris, abonnements, signalements et modération.
 *
 * Protection contre les abus :
 *  - limites de publication par utilisateur ; liens limités ; doublons refusés (empreinte du texte) ;
 *  - motifs typiques d'arnaque → mise en attente de modération ;
 *  - contenu promotionnel non déclaré → refusé tant qu'il n'est pas marqué « sponsorisé » ;
 *  - masquage automatique après 3 signalements distincts, en attendant une décision humaine ;
 *  - les badges « vérifié » et « officiel » ne sont attribués que par la modération.
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { zBool } from "@/lib/utils/zod";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { getDestination } from "@/data/destinations";
import { newId, sha256 } from "@/lib/utils/ids";
import { rateLimit } from "./rate-limit";
import { ForbiddenError, NotFoundError, RateLimitError, UserFacingError } from "./errors";
import type { SessionUser } from "./auth";
import { notify } from "./notifications";

export const CATEGORY_LABELS: Record<(typeof s.TIP_CATEGORIES)[number], string> = {
  pratique: "Conseil pratique",
  economies: "Astuce pour économiser",
  itineraire: "Itinéraire",
  restaurants: "Restaurants",
  "lieux-secrets": "Lieu peu connu",
  transports: "Transports",
  erreurs: "Erreur à éviter",
  quartiers: "Quartiers",
  hebergement: "Hébergement",
  saison: "Astuce saisonnière",
};

export const KIND_LABELS = {
  experience: "Expérience personnelle",
  verified: "Récemment vérifié",
  official: "Information officielle",
  sponsored: "Contenu sponsorisé",
} as const;

const SCAM = [/whats\s?app/i, /telegram/i, /western\s?union/i, /moneygram/i, /\b(btc|bitcoin|usdt|crypto)\b/i, /contacte[zr]?[- ]moi/i, /\+\d{6,}/, /virement\s+(direct|avant)/i, /carte\s+cadeau/i];
const PROMO = [/code\s?promo/i, /lien\s+(d'?affiliation|affilié|partenaire)/i, /r[ée]servez\s+(via|avec)\s+mon\s+lien/i, /-\s?\d{1,2}\s?%\s+avec/i, /\bsponsor/i, /utilisez\s+le\s+code/i];

export const tipInputSchema = z.object({
  destinationSlug: z.string().refine((x) => !!getDestination(x), "Destination inconnue"),
  category: z.enum(s.TIP_CATEGORIES),
  kind: z.enum(["experience", "sponsored", "official"]).default("experience"),
  title: z.string().trim().min(8, "Titre trop court").max(120),
  body: z.string().trim().min(40, "Détaillez un peu plus votre conseil (40 caractères minimum)").max(4000),
  sponsorName: z.string().trim().max(80).optional(),
  sourceUrl: z.string().trim().url().max(500).optional(),
});

const countLinks = (t: string) => (t.match(/https?:\/\/|www\./gi) ?? []).length;
export const normalizeForHash = (t: string) => t.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();

export type ModerationVerdict = { status: "published" | "pending"; reasons: string[] };

/** Analyse automatique d'un texte (pure, testée). Lève une erreur pour les refus nets. */
export function screenContent(input: { title: string; body: string; kind: string; accountAgeMinutes: number }): ModerationVerdict {
  const text = `${input.title}\n${input.body}`;
  const links = countLinks(text);
  if (links > 2) throw new UserFacingError("Trop de liens : 2 au maximum par conseil.");
  if (input.kind !== "sponsored" && PROMO.some((r) => r.test(text)))
    throw new UserFacingError("Ce contenu semble promotionnel. S'il s'agit d'un partenariat, déclarez-le comme « contenu sponsorisé » et indiquez le partenaire.");
  const reasons: string[] = [];
  if (SCAM.some((r) => r.test(text))) reasons.push("motif d'arnaque possible (contact privé, paiement inhabituel)");
  if (links > 0 && input.accountAgeMinutes < 60 * 24) reasons.push("lien publié par un compte de moins de 24 h");
  if (/(.)\1{9,}/.test(text) || (text.match(/[A-Z]/g)?.length ?? 0) > text.length * 0.6) reasons.push("mise en forme suspecte");
  if (input.kind === "official") reasons.push("information officielle à confirmer par la modération");
  return { status: reasons.length ? "pending" : "published", reasons };
}

export async function createTip(user: SessionUser, raw: unknown) {
  const input = tipInputSchema.parse(raw);
  if (input.kind === "sponsored" && !input.sponsorName) throw new UserFacingError("Indiquez le nom du partenaire pour un contenu sponsorisé.");
  if (input.kind === "official" && !input.sourceUrl) throw new UserFacingError("Une information officielle doit citer sa source (lien).");
  const rl = rateLimit(`tip:${user.id}`, 5, 3600_000);
  if (!rl.ok) throw new RateLimitError(rl.retryAfterSec, "Limite de 5 conseils par heure atteinte.");
  const db = await getDb();
  const [u] = await db.select({ createdAt: s.users.createdAt }).from(s.users).where(eq(s.users.id, user.id));
  const hash = sha256(normalizeForHash(input.body));
  const dup = await db.select({ id: s.tips.id }).from(s.tips).where(and(eq(s.tips.contentHash, hash), gte(s.tips.createdAt, new Date(Date.now() - 90 * 86400_000)))).limit(1);
  if (dup.length) throw new UserFacingError("Ce conseil a déjà été publié.");
  const verdict = screenContent({ ...input, accountAgeMinutes: (Date.now() - (u?.createdAt.getTime() ?? Date.now())) / 60000 });
  const id = newId();
  await db.insert(s.tips).values({
    id,
    authorId: user.id,
    destinationSlug: input.destinationSlug,
    countryIso: getDestination(input.destinationSlug)!.countryIso,
    category: input.category,
    kind: input.kind === "official" ? "experience" : input.kind, // « officiel » n'est attribué qu'après vérification
    title: input.title,
    body: input.body,
    sponsorName: input.kind === "sponsored" ? input.sponsorName : null,
    sourceUrl: input.sourceUrl ?? null,
    status: verdict.status,
    moderationNote: verdict.reasons.join(" ; ") || null,
    contentHash: hash,
  });
  return { id, status: verdict.status, reasons: verdict.reasons };
}

/* --------------------------------- Classement --------------------------------- */

const TIME_SENSITIVE = new Set(["pratique", "transports", "economies", "saison", "hebergement"]);

export type RankInput = {
  likeCount: number;
  saveCount: number;
  commentCount: number;
  reportCount: number;
  createdAt: Date;
  verifiedAt: Date | null;
  kind: string;
  category: string;
  bodyLength: number;
  authorLikes: number;
};

/** Score d'utilité multifactoriel (pur, testé) avec décomposition explicable. */
export function usefulnessScore(t: RankInput, now = new Date()) {
  const ageDays = (now.getTime() - t.createdAt.getTime()) / 86400_000;
  const halfLife = TIME_SENSITIVE.has(t.category) ? 120 : 365;
  const freshness = Math.pow(0.5, ageDays / halfLife);
  const engagement = Math.log2(1 + t.likeCount) + 1.3 * Math.log2(1 + t.saveCount) + 0.4 * Math.log2(1 + t.commentCount);
  const verifiedRecently = t.verifiedAt && now.getTime() - t.verifiedAt.getTime() < 180 * 86400_000;
  const verification = verifiedRecently ? 1.5 : t.kind === "official" ? 1 : 0;
  const reputation = Math.min(1.5, Math.log10(1 + t.authorLikes) / 2);
  const quality = t.bodyLength >= 120 && t.bodyLength <= 2000 ? 0.3 : 0;
  const reports = t.reportCount * 0.8;
  const sponsorFactor = t.kind === "sponsored" ? 0.7 : 1;
  const raw = Math.max(0, engagement + verification + reputation + quality - reports);
  const score = raw * (0.4 + 0.6 * freshness) * sponsorFactor;
  return {
    score: Math.round(score * 100) / 100,
    factors: {
      engagement: Math.round(engagement * 100) / 100,
      verification,
      reputation: Math.round(reputation * 100) / 100,
      quality,
      reportsPenalty: reports,
      freshness: Math.round(freshness * 100) / 100,
      sponsorFactor,
    },
  };
}

export const listQuerySchema = z.object({
  destination: z.string().optional(),
  country: z.string().length(2).optional(),
  category: z.enum(s.TIP_CATEGORIES).optional(),
  kind: z.enum(["experience", "verified", "official", "sponsored"]).optional(),
  since: z.coerce.number().int().min(1).max(3650).optional(), // jours
  sort: z.enum(["useful", "recent"]).default("useful"),
  author: z.string().optional(),
  following: zBool(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function listTips(raw: unknown, viewer: SessionUser | null) {
  const q = listQuerySchema.parse(raw);
  const db = await getDb();
  const conds = [eq(s.tips.status, "published")];
  if (q.destination) conds.push(eq(s.tips.destinationSlug, q.destination));
  if (q.country) conds.push(eq(s.tips.countryIso, q.country.toUpperCase()));
  if (q.category) conds.push(eq(s.tips.category, q.category));
  if (q.kind) conds.push(eq(s.tips.kind, q.kind));
  if (q.since) conds.push(gte(s.tips.createdAt, new Date(Date.now() - q.since * 86400_000)));
  if (q.author) conds.push(eq(s.users.handle, q.author));
  if (q.following && viewer) conds.push(sql`${s.tips.authorId} in (select followee_id from follows where follower_id = ${viewer.id})`);
  const rows = await db
    .select({
      tip: s.tips,
      author: { id: s.users.id, displayName: s.users.displayName, handle: s.users.handle, avatarColor: s.users.avatarColor },
      authorLikes: sql<number>`(select coalesce(sum(t2.like_count),0)::int from tips t2 where t2.author_id = ${s.tips.authorId})`,
    })
    .from(s.tips)
    .innerJoin(s.users, eq(s.users.id, s.tips.authorId))
    .where(and(...conds))
    .orderBy(desc(s.tips.createdAt))
    .limit(300);
  let liked = new Set<string>();
  let saved = new Set<string>();
  let followed = new Set<string>();
  if (viewer && rows.length) {
    const ids = rows.map((r) => r.tip.id);
    liked = new Set((await db.select({ id: s.tipLikes.tipId }).from(s.tipLikes).where(and(eq(s.tipLikes.userId, viewer.id), inArray(s.tipLikes.tipId, ids)))).map((r) => r.id));
    saved = new Set((await db.select({ id: s.tipSaves.tipId }).from(s.tipSaves).where(and(eq(s.tipSaves.userId, viewer.id), inArray(s.tipSaves.tipId, ids)))).map((r) => r.id));
    followed = new Set((await db.select({ id: s.follows.followeeId }).from(s.follows).where(eq(s.follows.followerId, viewer.id))).map((r) => r.id));
  }
  const now = new Date();
  const items = rows.map((r) => {
    const rank = usefulnessScore({ ...r.tip, bodyLength: r.tip.body.length, authorLikes: r.authorLikes }, now);
    return {
      ...r.tip,
      author: r.author,
      rank,
      viewer: { liked: liked.has(r.tip.id), saved: saved.has(r.tip.id), followsAuthor: followed.has(r.author.id), isAuthor: viewer?.id === r.author.id },
    };
  });
  if (q.sort === "useful") items.sort((a, b) => b.rank.score - a.rank.score);
  return items.slice(0, q.limit);
}

export async function getTip(tipId: string, viewer: SessionUser | null) {
  const db = await getDb();
  const [row] = await db
    .select({ tip: s.tips, author: { id: s.users.id, displayName: s.users.displayName, handle: s.users.handle, avatarColor: s.users.avatarColor } })
    .from(s.tips)
    .innerJoin(s.users, eq(s.users.id, s.tips.authorId))
    .where(eq(s.tips.id, tipId));
  if (!row) throw new NotFoundError("Conseil introuvable");
  const canSee = row.tip.status === "published" || viewer?.id === row.author.id || (viewer && viewer.role !== "user");
  if (!canSee) throw new NotFoundError("Conseil introuvable");
  const comments = await db
    .select({ c: s.comments, author: { displayName: s.users.displayName, handle: s.users.handle, avatarColor: s.users.avatarColor } })
    .from(s.comments)
    .innerJoin(s.users, eq(s.users.id, s.comments.authorId))
    .where(and(eq(s.comments.tipId, tipId), eq(s.comments.status, "published")))
    .orderBy(s.comments.createdAt);
  return { ...row.tip, author: row.author, comments: comments.map((x) => ({ ...x.c, author: x.author })) };
}

async function assertPublishedTip(tipId: string) {
  const db = await getDb();
  const [t] = await db.select({ id: s.tips.id, status: s.tips.status, authorId: s.tips.authorId, title: s.tips.title }).from(s.tips).where(eq(s.tips.id, tipId));
  if (!t || t.status !== "published") throw new NotFoundError("Conseil introuvable");
  return t;
}

export async function toggleLike(user: SessionUser, tipId: string) {
  const tip = await assertPublishedTip(tipId);
  if (tip.authorId === user.id) throw new UserFacingError("Vous ne pouvez pas aimer votre propre conseil.");
  const db = await getDb();
  const del = await db.delete(s.tipLikes).where(and(eq(s.tipLikes.userId, user.id), eq(s.tipLikes.tipId, tipId))).returning();
  if (del.length) {
    await db.update(s.tips).set({ likeCount: sql`greatest(0, ${s.tips.likeCount} - 1)` }).where(eq(s.tips.id, tipId));
    return { liked: false };
  }
  await db.insert(s.tipLikes).values({ userId: user.id, tipId });
  await db.update(s.tips).set({ likeCount: sql`${s.tips.likeCount} + 1` }).where(eq(s.tips.id, tipId));
  return { liked: true };
}

export async function toggleSave(user: SessionUser, tipId: string) {
  await assertPublishedTip(tipId);
  const db = await getDb();
  const del = await db.delete(s.tipSaves).where(and(eq(s.tipSaves.userId, user.id), eq(s.tipSaves.tipId, tipId))).returning();
  if (del.length) {
    await db.update(s.tips).set({ saveCount: sql`greatest(0, ${s.tips.saveCount} - 1)` }).where(eq(s.tips.id, tipId));
    return { saved: false };
  }
  await db.insert(s.tipSaves).values({ userId: user.id, tipId });
  await db.update(s.tips).set({ saveCount: sql`${s.tips.saveCount} + 1` }).where(eq(s.tips.id, tipId));
  return { saved: true };
}

export const commentSchema = z.object({ body: z.string().trim().min(2).max(1500), parentId: z.string().uuid().optional() });

export async function addComment(user: SessionUser, tipId: string, raw: unknown) {
  const input = commentSchema.parse(raw);
  const tip = await assertPublishedTip(tipId);
  const rl = rateLimit(`comment:${user.id}`, 20, 3600_000);
  if (!rl.ok) throw new RateLimitError(rl.retryAfterSec, "Trop de commentaires en peu de temps.");
  if (countLinks(input.body) > 1) throw new UserFacingError("Un seul lien autorisé par commentaire.");
  if (SCAM.some((r) => r.test(input.body))) throw new UserFacingError("Pour votre sécurité, les coordonnées privées et moyens de paiement ne sont pas autorisés dans les commentaires.");
  const db = await getDb();
  if (input.parentId) {
    const [p] = await db.select({ tipId: s.comments.tipId, parentId: s.comments.parentId }).from(s.comments).where(eq(s.comments.id, input.parentId));
    if (!p || p.tipId !== tipId) throw new UserFacingError("Commentaire parent invalide");
    if (p.parentId) input.parentId = p.parentId; // on aplatit à 2 niveaux pour rester lisible
  }
  const id = newId();
  await db.insert(s.comments).values({ id, tipId, authorId: user.id, parentId: input.parentId ?? null, body: input.body });
  await db.update(s.tips).set({ commentCount: sql`${s.tips.commentCount} + 1` }).where(eq(s.tips.id, tipId));
  if (tip.authorId !== user.id)
    await notify({ userId: tip.authorId, type: "community", title: "💬 Nouveau commentaire sur votre conseil", body: `${user.displayName} a commenté « ${tip.title} ».`, link: `/communaute/${tipId}`, mascot: "happy", channels: { inApp: true, email: false, push: false } });
  return { id };
}

export const reportSchema = z.object({
  targetType: z.enum(["tip", "comment"]),
  targetId: z.string().uuid(),
  reason: z.enum(["spam", "fraude", "dangereux", "faux-avis", "sponsorise-non-declare", "offensant", "autre"]),
  details: z.string().max(1000).default(""),
});

export const AUTO_HIDE_REPORTS = 3;

export async function report(user: SessionUser, raw: unknown) {
  const r = reportSchema.parse(raw);
  const db = await getDb();
  const inserted = await db.insert(s.reports).values({ id: newId(), reporterId: user.id, ...r }).onConflictDoNothing().returning({ id: s.reports.id });
  if (!inserted.length) return { alreadyReported: true };
  if (r.targetType === "tip") {
    const [t] = await db.update(s.tips).set({ reportCount: sql`${s.tips.reportCount} + 1` }).where(eq(s.tips.id, r.targetId)).returning({ n: s.tips.reportCount });
    if (t && t.n >= AUTO_HIDE_REPORTS) await db.update(s.tips).set({ status: "pending", moderationNote: "Masqué automatiquement après plusieurs signalements" }).where(eq(s.tips.id, r.targetId));
  } else {
    const [c] = await db.update(s.comments).set({ reportCount: sql`${s.comments.reportCount} + 1` }).where(eq(s.comments.id, r.targetId)).returning({ n: s.comments.reportCount });
    if (c && c.n >= AUTO_HIDE_REPORTS) await db.update(s.comments).set({ status: "hidden" }).where(eq(s.comments.id, r.targetId));
  }
  return { alreadyReported: false };
}

export async function toggleFollow(user: SessionUser, handle: string) {
  const db = await getDb();
  const [target] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.handle, handle));
  if (!target) throw new NotFoundError("Voyageur introuvable");
  if (target.id === user.id) throw new UserFacingError("Vous ne pouvez pas vous suivre vous-même.");
  const del = await db.delete(s.follows).where(and(eq(s.follows.followerId, user.id), eq(s.follows.followeeId, target.id))).returning();
  if (del.length) return { following: false };
  await db.insert(s.follows).values({ followerId: user.id, followeeId: target.id });
  return { following: true };
}

export async function deleteOwnTip(user: SessionUser, tipId: string) {
  const db = await getDb();
  const [t] = await db.select({ authorId: s.tips.authorId }).from(s.tips).where(eq(s.tips.id, tipId));
  if (!t) throw new NotFoundError();
  if (t.authorId !== user.id && user.role === "user") throw new ForbiddenError();
  await db.delete(s.tips).where(eq(s.tips.id, tipId));
}

/* --------------------------------- Modération --------------------------------- */

export async function moderationQueue() {
  const db = await getDb();
  const pending = await db.select().from(s.tips).where(eq(s.tips.status, "pending")).orderBy(desc(s.tips.createdAt)).limit(100);
  const openReports = await db.select().from(s.reports).where(eq(s.reports.status, "open")).orderBy(desc(s.reports.createdAt)).limit(200);
  return { pending, openReports };
}

export const moderationActionSchema = z.object({
  tipId: z.string().uuid(),
  action: z.enum(["approve", "hide", "verify", "mark_official"]),
  note: z.string().max(300).optional(),
});

export async function moderate(mod: SessionUser, raw: unknown) {
  if (mod.role === "user") throw new ForbiddenError();
  const a = moderationActionSchema.parse(raw);
  const db = await getDb();
  const set =
    a.action === "approve"
      ? { status: "published" as const, reportCount: 0 }
      : a.action === "hide"
        ? { status: "hidden" as const }
        : a.action === "verify"
          ? { status: "published" as const, kind: "verified" as const, verifiedAt: new Date() }
          : { status: "published" as const, kind: "official" as const, verifiedAt: new Date() };
  await db.update(s.tips).set({ ...set, moderationNote: a.note ?? null, updatedAt: new Date() }).where(eq(s.tips.id, a.tipId));
  await db
    .update(s.reports)
    .set({ status: a.action === "hide" ? "resolved" : "dismissed", resolvedBy: mod.id, resolvedAt: new Date() })
    .where(and(eq(s.reports.targetType, "tip"), eq(s.reports.targetId, a.tipId), eq(s.reports.status, "open")));
}

export async function publicProfile(handle: string, viewer: SessionUser | null) {
  const db = await getDb();
  const [u] = await db
    .select({ id: s.users.id, displayName: s.users.displayName, handle: s.users.handle, bio: s.users.bio, avatarColor: s.users.avatarColor, createdAt: s.users.createdAt, privacy: s.privacySettings })
    .from(s.users)
    .leftJoin(s.privacySettings, eq(s.privacySettings.userId, s.users.id))
    .where(eq(s.users.handle, handle));
  if (!u) throw new NotFoundError("Voyageur introuvable");
  const isSelf = viewer?.id === u.id;
  const followers = await db.select({ n: sql<number>`count(*)::int` }).from(s.follows).where(eq(s.follows.followeeId, u.id));
  const viewerFollows = viewer ? (await db.select().from(s.follows).where(and(eq(s.follows.followerId, viewer.id), eq(s.follows.followeeId, u.id)))).length > 0 : false;
  const followsViewer = viewer ? (await db.select().from(s.follows).where(and(eq(s.follows.followerId, u.id), eq(s.follows.followeeId, viewer.id)))).length > 0 : false;
  const friends = viewerFollows && followsViewer; // « amis » = abonnement mutuel
  const visible = (v: "public" | "friends" | "private" | undefined) => isSelf || v === "public" || (v === "friends" && friends);
  return {
    displayName: u.displayName,
    handle: u.handle,
    bio: visible(u.privacy?.profileVisibility) ? u.bio : "",
    avatarColor: u.avatarColor,
    memberSince: u.createdAt,
    followers: followers[0]?.n ?? 0,
    viewerFollows,
    isSelf,
    canSeeMap: visible(u.privacy?.mapVisibility),
    userId: u.id,
  };
}
