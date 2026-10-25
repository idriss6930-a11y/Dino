import { z } from "zod";
import { api } from "@/lib/api";
import { authenticate } from "@/lib/services/auth";
import { clientIp, startSession } from "@/lib/session";

const schema = z.object({ email: z.string().max(254), password: z.string().min(1).max(200) });

export const POST = api(async (req) => {
  const { email, password } = schema.parse(await req.json());
  const { userId } = await authenticate(email, password, await clientIp());
  await startSession(userId);
  return { ok: true };
});
