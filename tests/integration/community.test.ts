import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { registerUser, type SessionUser } from "@/lib/services/auth";
import { addComment, createTip, getTip, listTips, moderate, report, toggleFollow, toggleLike, publicProfile } from "@/lib/services/community";
import { getPublicWorld, updatePrefs, upsertPlace } from "@/lib/services/me";
import { ForbiddenError, NotFoundError, UserFacingError } from "@/lib/services/errors";

let n = 0;
async function user(role: "user" | "moderator" = "user", ageHours = 48): Promise<SessionUser> {
  const email = `c${Date.now()}${n++}@exemple.test`;
  const { id, handle } = await registerUser({ email, password: "phrase-de-passe-solide-42", displayName: `Voyageur ${n}`, acceptTerms: true });
  const db = await getDb();
  await db.update(s.users).set({ role, createdAt: new Date(Date.now() - ageHours * 3600_000) }).where(eq(s.users.id, id));
  return { id, email, displayName: `Voyageur ${n}`, handle, role, plan: "free", avatarColor: "#000" };
}

const tip = (extra = {}) => ({ destinationSlug: "lisbonne", category: "transports", title: `Le tram tôt le matin ${Math.random()}`, body: `Prendre le tram 28 avant 9 h évite la foule et les pickpockets, testé en mars. ${Math.random()}`, ...extra });

describe("communauté", () => {
  it("publie, empêche l'auto-like, compte les likes et les commentaires sur deux niveaux", async () => {
    const a = await user();
    const b = await user();
    const { id, status } = await createTip(a, tip());
    expect(status).toBe("published");
    await expect(toggleLike(a, id)).rejects.toBeInstanceOf(UserFacingError);
    expect(await toggleLike(b, id)).toEqual({ liked: true });
    const { id: c1 } = await addComment(b, id, { body: "Merci, très utile !" });
    await addComment(a, id, { body: "Avec plaisir.", parentId: c1 });
    const t = await getTip(id, null);
    expect(t.likeCount).toBe(1);
    expect(t.comments).toHaveLength(2);
    const db = await getDb();
    const notif = await db.select().from(s.notifications).where(eq(s.notifications.userId, a.id));
    expect(notif.some((x) => x.type === "community")).toBe(true);
  });

  it("refuse un doublon de contenu", async () => {
    const a = await user();
    const t = tip();
    await createTip(a, t);
    await expect(createTip(a, { ...t, title: "Autre titre pour le même texte" })).rejects.toThrow(/déjà/);
  });

  it("masque automatiquement après plusieurs signalements, puis la modération tranche", async () => {
    const a = await user();
    const { id } = await createTip(a, tip());
    for (let i = 0; i < 3; i++) await report(await user(), { targetType: "tip", targetId: id, reason: "spam" });
    await expect(getTip(id, null)).rejects.toBeInstanceOf(NotFoundError);
    const mod = await user("moderator");
    await expect(moderate(a, { tipId: id, action: "approve" })).rejects.toBeInstanceOf(ForbiddenError);
    await moderate(mod, { tipId: id, action: "verify" });
    const t = await getTip(id, null);
    expect(t.status).toBe("published");
    expect(t.kind).toBe("verified");
  });

  it("une information « officielle » reste en attente tant que la modération ne l'a pas confirmée", async () => {
    const a = await user();
    const r = await createTip(a, tip({ kind: "official", sourceUrl: "https://www.visitlisboa.com" }));
    expect(r.status).toBe("pending");
    expect((await listTips({ destination: "lisbonne", limit: 50 }, null)).some((x) => x.id === r.id)).toBe(false);
  });

  it("respecte la confidentialité de la carte : privée par défaut, visible par les amis si choisi", async () => {
    const a = await user();
    const b = await user();
    await upsertPlace(a.id, { countryIso: "JP", status: "visited" });
    expect((await getPublicWorld(a.handle, b)).visible).toBe(false);
    await updatePrefs(a.id, { mapVisibility: "friends" });
    expect((await getPublicWorld(a.handle, b)).visible).toBe(false);
    await toggleFollow(a, b.handle);
    await toggleFollow(b, a.handle);
    expect((await getPublicWorld(a.handle, b)).visible).toBe(true);
    expect((await publicProfile(a.handle, null)).canSeeMap).toBe(false);
    await expect(toggleFollow(a, a.handle)).rejects.toThrow();
  });
});
