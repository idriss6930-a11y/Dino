import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { changePassword } from "@/lib/services/auth";

const schema = z.object({ current: z.string().min(1).max(200), next: z.string().max(200) });

export const POST = api(async (req) => {
  const user = await requireUser();
  const { current, next } = schema.parse(await req.json());
  await changePassword(user.id, current, next);
  return { ok: true };
}, { rate: { name: "password", limit: 10, windowMs: 3_600_000 } });
