import { z } from "zod";
import { api } from "@/lib/api";
import { resetPassword } from "@/lib/services/auth";

const schema = z.object({ token: z.string().min(20).max(200), password: z.string().max(200) });

export const POST = api(async (req) => {
  const { token, password } = schema.parse(await req.json());
  await resetPassword(token, password);
  return { ok: true };
}, { rate: { name: "reset", limit: 10, windowMs: 3_600_000 } });
