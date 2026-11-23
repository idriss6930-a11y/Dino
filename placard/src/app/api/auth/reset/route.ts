import { z } from "zod";
import { api } from "@/lib/api";
import { resetPassword } from "@/lib/services/auth";

export const POST = api(async (req) => {
  const { token, password } = z.object({ token: z.string().min(10).max(100), password: z.string().max(200) }).parse(await req.json());
  await resetPassword(token, password);
  return { ok: true };
}, { rate: { name: "reset", limit: 10, windowMs: 3_600_000 } });
