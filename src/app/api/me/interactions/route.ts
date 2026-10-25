import { z } from "zod";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { recordInteraction } from "@/lib/services/me";

const schema = z.object({ slug: z.string().max(60), kind: z.enum(["view", "dismiss", "like"]) });

/** Signal facultatif pour les recommandations ; ignoré sans compte ou si la personnalisation est désactivée. */
export const POST = api(async (req) => {
  const { slug, kind } = schema.parse(await req.json());
  const user = await getSessionUser();
  if (user) await recordInteraction(user.id, slug, kind);
  return { ok: true };
});
