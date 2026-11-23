import { api } from "@/lib/api";
import { registerUser } from "@/lib/services/auth";
import { startSession } from "@/lib/session";

export const POST = api(async (req) => {
  const { id } = await registerUser(await req.json());
  await startSession(id);
  return { ok: true };
}, { rate: { name: "register", limit: Number(process.env.REGISTER_RATE_LIMIT ?? 5), windowMs: 3_600_000 } });
