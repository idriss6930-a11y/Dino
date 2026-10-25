import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { authenticate, createSession, deleteAccount, exportUserData, getUserBySessionToken, registerUser, requestPasswordReset, resetPassword } from "@/lib/services/auth";
import { checkAlert, createAlert, deleteAlert, listAlerts, updateAlert } from "@/lib/services/alerts";
import { createTrip, deleteTrip, getWorld, removePlace, upsertPlace } from "@/lib/services/me";
import { AuthError, ForbiddenError, RateLimitError } from "@/lib/services/errors";
import { addDays, todayIn } from "@/lib/utils/dates";

let n = 0;
const uniq = () => `t${Date.now()}${n++}@exemple.test`;
const PW = "phrase-de-passe-solide-42";

async function makeUser() {
  const email = uniq();
  const { id } = await registerUser({ email, password: PW, displayName: "Testeur", acceptTerms: true });
  return { id, email, plan: "free" as const };
}

beforeAll(async () => {
  await getDb();
});

describe("comptes", () => {
  it("inscrit, connecte et ouvre une session sans stocker le jeton en clair", async () => {
    const u = await makeUser();
    await expect(authenticate(u.email, PW, "1.1.1.1")).resolves.toEqual({ userId: u.id });
    const { token } = await createSession(u.id, "test");
    const db = await getDb();
    const rows = await db.select().from(s.sessions).where(eq(s.sessions.userId, u.id));
    expect(rows[0].tokenHash).not.toBe(token);
    expect((await getUserBySessionToken(token))?.id).toBe(u.id);
    const [userRow] = await db.select().from(s.users).where(eq(s.users.id, u.id));
    expect(userRow.passwordHash.startsWith("scrypt$")).toBe(true);
  });

  it("refuse un doublon d'e-mail et un mauvais mot de passe, puis limite les tentatives", async () => {
    const u = await makeUser();
    await expect(registerUser({ email: u.email, password: PW, displayName: "Bis", acceptTerms: true })).rejects.toThrow();
    for (let i = 0; i < 5; i++) await expect(authenticate(u.email, "mauvais-mot-de-passe", "2.2.2.2")).rejects.toBeInstanceOf(AuthError);
    await expect(authenticate(u.email, PW, "2.2.2.2")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("exige l'acceptation de la politique de confidentialité et un mot de passe correct", async () => {
    await expect(registerUser({ email: uniq(), password: PW, displayName: "X", acceptTerms: false })).rejects.toThrow();
    await expect(registerUser({ email: uniq(), password: "court", displayName: "Testeur", acceptTerms: true })).rejects.toThrow();
  });

  it("réinitialise le mot de passe avec un jeton à usage unique et ferme les sessions", async () => {
    const u = await makeUser();
    const { token: session } = await createSession(u.id);
    const token = await requestPasswordReset(u.email, "http://localhost");
    expect(token).toBeTruthy();
    await resetPassword(token!, "nouvelle-phrase-secrete-7");
    await expect(resetPassword(token!, "encore-une-autre-phrase-8")).rejects.toThrow();
    expect(await getUserBySessionToken(session)).toBeNull();
    await expect(authenticate(u.email, "nouvelle-phrase-secrete-7", "3.3.3.3")).resolves.toEqual({ userId: u.id });
  });

  it("exporte les données sans le hachage du mot de passe puis supprime tout en cascade", async () => {
    const u = await makeUser();
    await createTrip(u.id, { title: "Lisbonne au printemps", destinationSlug: "lisbonne" });
    const data = await exportUserData(u.id);
    expect(JSON.stringify(data)).not.toContain("scrypt$");
    expect(data.trips).toHaveLength(1);
    await expect(deleteAccount(u.id, "faux")).rejects.toThrow();
    await deleteAccount(u.id, PW);
    const db = await getDb();
    expect(await db.select().from(s.trips).where(eq(s.trips.userId, u.id))).toHaveLength(0);
    expect(await db.select().from(s.users).where(eq(s.users.id, u.id))).toHaveLength(0);
  });
});

describe("cloisonnement des données personnelles", () => {
  it("empêche un utilisateur de modifier ou supprimer les données d'un autre", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const { id: tripId } = await createTrip(a.id, { title: "Voyage privé" });
    await expect(deleteTrip(b.id, tripId)).rejects.toBeInstanceOf(ForbiddenError);
    await upsertPlace(a.id, { countryIso: "PT", status: "visited" });
    const placeId = (await getWorld(a.id)).places[0].id;
    await expect(removePlace(b.id, placeId)).rejects.toBeInstanceOf(ForbiddenError);
    const { id: alertId } = await createAlert(a, { kind: "route", criteria: { origin: "PAR", destination: "LIS", departDate: addDays(todayIn(), 40) }, dropPct: 10 });
    await expect(deleteAlert(b.id, alertId)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateAlert(b.id, alertId, { active: false })).rejects.toBeInstanceOf(ForbiddenError);
    expect(await listAlerts(b.id)).toHaveLength(0);
  });
});

describe("alertes", () => {
  it("applique la fréquence minimale de la formule gratuite", async () => {
    const u = await makeUser();
    const r = await createAlert(u, { kind: "route", criteria: { origin: "PAR", destination: "LIS", departDate: addDays(todayIn(), 40) }, maxPrice: 50, checkEveryMinutes: 60 });
    expect(r.checkEveryMinutes).toBeGreaterThanOrEqual(360);
    expect(r.note).toBeTruthy();
  });

  it("notifie une seule fois pour le même prix (pas de doublon) et marque les données de démonstration", async () => {
    const u = await makeUser();
    const { id } = await createAlert(u, { kind: "route", criteria: { origin: "PAR", destination: "LIS", departDate: addDays(todayIn(), 45) }, maxPrice: 5000 });
    const first = await checkAlert(id);
    expect(first.status).toBe("notified");
    const second = await checkAlert(id, new Date(Date.now() + 13 * 3600_000));
    expect(second.status).toBe("checked");
    const db = await getDb();
    const events = await db.select().from(s.alertEvents).where(eq(s.alertEvents.alertId, id));
    expect(events).toHaveLength(1);
    expect(events[0].isDemo).toBe(true);
    const notifs = await db.select().from(s.notifications).where(and(eq(s.notifications.userId, u.id)));
    expect(notifs).toHaveLength(1);
    expect(notifs[0].title).toContain("démonstration");
  });

  it("n'envoie pas de « baisse » au premier relevé : il devient la référence", async () => {
    const u = await makeUser();
    const { id } = await createAlert(u, { kind: "route", criteria: { origin: "PAR", destination: "LIS", departDate: addDays(todayIn(), 50) }, dropPct: 10 });
    const r = await checkAlert(id);
    expect(r.status).toBe("checked");
    const [a] = (await listAlerts(u.id)).filter((x) => x.id === id);
    expect(a.referencePriceCents).toBeGreaterThan(0);
  });

  it("respecte la limite d'alertes de la formule", async () => {
    const u = await makeUser();
    for (let i = 0; i < 10; i++) await createAlert(u, { kind: "deal", criteria: { origin: "PAR" } });
    await expect(createAlert(u, { kind: "deal", criteria: { origin: "PAR" } })).rejects.toThrow(/Limite/);
  });
});
