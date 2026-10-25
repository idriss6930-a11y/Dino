import { z } from "zod";
import { api } from "@/lib/api";
import { endSession, requireUser } from "@/lib/session";
import { deleteAccount } from "@/lib/services/auth";

const schema = z.object({ password: z.string().min(1).max(200), confirm: z.literal("SUPPRIMER", { error: "Tapez SUPPRIMER pour confirmer" }) });

export const POST = api(async (req) => {
  const user = await requireUser();
  const { password } = schema.parse(await req.json());
  await deleteAccount(user.id, password);
  await endSession();
  return { ok: true };
}, { rate: { name: "delete", limit: 5, windowMs: 3_600_000 } });
