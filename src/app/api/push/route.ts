import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { pushConfigured, removePushSubscription, savePushSubscription } from "@/lib/services/notifications";
import { UserFacingError } from "@/lib/services/errors";

/** La clé publique VAPID est publique par nature ; la clé privée ne quitte jamais le serveur. */
export const GET = api(async () => ({ configured: pushConfigured(), publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null }));

export const POST = api(async (req) => {
  const user = await requireUser();
  if (!pushConfigured()) throw new UserFacingError("Les notifications push ne sont pas configurées sur ce serveur.");
  await savePushSubscription(user.id, await req.json());
  return { ok: true };
});

export const DELETE = api(async (req) => {
  const user = await requireUser();
  const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(await req.json());
  await removePushSubscription(user.id, endpoint);
  return { ok: true };
});
