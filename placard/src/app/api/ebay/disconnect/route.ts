import { api } from "@/lib/api";
import { disconnectEbay } from "@/lib/ebay/client";
import { requireUser } from "@/lib/session";

export const POST = api(async () => {
  await disconnectEbay((await requireUser()).id);
  return { ok: true };
});
