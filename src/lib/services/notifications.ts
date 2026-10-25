/**
 * Notifications : in-app (toujours), e-mail (SMTP) et web push (VAPID) selon les préférences de l'utilisateur.
 * Un plafond quotidien par utilisateur protège contre le spam.
 */
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { log } from "@/lib/log";
import { newId } from "@/lib/utils/ids";
import { sendMail } from "./mailer";

export type NotificationInput = {
  userId: string;
  type: "price_drop" | "price_threshold" | "budget_match" | "deal" | "system" | "community";
  title: string;
  body: string;
  link?: string;
  mascot?: "happy" | "surprised" | "thinking" | "explorer" | "sleeping";
  alertEventId?: string;
  channels?: { inApp: boolean; email: boolean; push: boolean };
};

export function pushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function notificationsSentToday(userId: string, types: string[] = ["price_drop", "price_threshold", "budget_match", "deal"]) {
  const db = await getDb();
  const since = new Date(Date.now() - 24 * 3600_000);
  const rows = await db.select({ type: s.notifications.type, n: count() }).from(s.notifications).where(and(eq(s.notifications.userId, userId), gte(s.notifications.createdAt, since))).groupBy(s.notifications.type);
  return rows.filter((r) => types.includes(r.type)).reduce((a, r) => a + r.n, 0);
}

export async function notify(input: NotificationInput) {
  const db = await getDb();
  const [prefs] = await db.select().from(s.userPreferences).where(eq(s.userPreferences.userId, input.userId));
  const [user] = await db.select({ email: s.users.email }).from(s.users).where(eq(s.users.id, input.userId));
  if (!user) return null;
  const ch = input.channels ?? { inApp: true, email: true, push: true };
  const delivery: Record<string, string> = {};
  const id = newId();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // L'in-app est conservé même si l'utilisateur a désactivé les autres canaux : c'est l'historique consultable.
  delivery.inApp = prefs?.notifyInApp === false && ch.inApp ? "masquée" : "ok";

  if (ch.email && prefs?.notifyEmail) {
    delivery.email = await sendMail(user.email, input.title, `${input.body}\n\n${input.link ? appUrl + input.link : appUrl}\n\nGérer ou désactiver ces notifications : ${appUrl}/compte#notifications`);
  }
  if (ch.push && prefs?.notifyPush) {
    if (!pushConfigured()) delivery.push = "not_configured";
    else {
      const subs = await db.select().from(s.pushSubscriptions).where(eq(s.pushSubscriptions.userId, input.userId));
      if (!subs.length) delivery.push = "no_subscription";
      else {
        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contact@dino.travel", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
        let sent = 0;
        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ title: input.title, body: input.body, url: input.link ?? "/" }),
              { TTL: 3600 },
            );
            sent++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id));
            else log.warn("push_failed", { status });
          }
        }
        delivery.push = sent ? `sent:${sent}` : "failed";
      }
    }
  }

  await db.insert(s.notifications).values({
    id,
    userId: input.userId,
    alertEventId: input.alertEventId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    mascot: input.mascot ?? "happy",
    delivery,
  });
  return { id, delivery };
}

export async function listNotifications(userId: string, limit = 30) {
  const db = await getDb();
  return db.select().from(s.notifications).where(eq(s.notifications.userId, userId)).orderBy(desc(s.notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string) {
  const db = await getDb();
  const [r] = await db.select({ n: count() }).from(s.notifications).where(and(eq(s.notifications.userId, userId), isNull(s.notifications.readAt)));
  return r?.n ?? 0;
}

export async function markAllRead(userId: string) {
  const db = await getDb();
  await db.update(s.notifications).set({ readAt: new Date() }).where(and(eq(s.notifications.userId, userId), isNull(s.notifications.readAt)));
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "Point de terminaison invalide"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscription(userId: string, raw: unknown) {
  const sub = pushSubscriptionSchema.parse(raw);
  const db = await getDb();
  await db
    .insert(s.pushSubscriptions)
    .values({ id: newId(), userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: s.pushSubscriptions.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const db = await getDb();
  await db.delete(s.pushSubscriptions).where(and(eq(s.pushSubscriptions.userId, userId), eq(s.pushSubscriptions.endpoint, endpoint)));
}
