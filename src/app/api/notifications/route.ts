import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { listNotifications, markAllRead, unreadCount } from "@/lib/services/notifications";

export const GET = api(async () => {
  const user = await requireUser();
  return { notifications: await listNotifications(user.id), unread: await unreadCount(user.id) };
});

export const POST = api(async () => {
  const user = await requireUser();
  await markAllRead(user.id);
  return { ok: true };
});
