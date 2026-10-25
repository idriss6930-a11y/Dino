import { api } from "@/lib/api";
import { endSession } from "@/lib/session";

export const POST = api(async () => {
  await endSession();
  return { ok: true };
});
