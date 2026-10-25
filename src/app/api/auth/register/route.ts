import { api } from "@/lib/api";
import { registerUser } from "@/lib/services/auth";
import { startSession } from "@/lib/session";

export const POST = api(async (req) => {
  const { id, handle } = await registerUser(await req.json());
  await startSession(id);
  return { ok: true, handle };
}, { rate: { name: "register", limit: 5, windowMs: 3_600_000 } });
