import { z } from "zod";
import { api } from "@/lib/api";
import { deleteAccount } from "@/lib/services/auth";
import { endSession, requireUser } from "@/lib/session";

export const POST = api(async (req) => {
  const user = await requireUser();
  const { password } = z.object({ password: z.string().min(1).max(200) }).parse(await req.json());
  await deleteAccount(user.id, password);
  await endSession();
  return { ok: true };
});
