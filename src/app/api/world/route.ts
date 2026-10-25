import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getWorld, upsertPlace } from "@/lib/services/me";

export const GET = api(async () => getWorld((await requireUser()).id));
export const POST = api(async (req) => {
  const user = await requireUser();
  await upsertPlace(user.id, await req.json());
  return getWorld(user.id);
});
