import { z } from "zod";
import { api } from "@/lib/api";
import { answer } from "@/lib/ai/assistant";
import { getSessionUser } from "@/lib/session";
import { getMe } from "@/lib/services/me";

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) })).min(1).max(20),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
});

export const POST = api(async (req) => {
  const body = bodySchema.parse(await req.json());
  const user = await getSessionUser();
  const prefs = user ? (await getMe(user.id)).prefs : null;
  return answer(body.messages, { currency: body.currency ?? prefs?.currency ?? "EUR", homeAirport: prefs?.homeAirport ?? null });
}, { rate: { name: "assistant", limit: 15, windowMs: 60_000 } });
