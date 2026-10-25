import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getWorld, removePlace } from "@/lib/services/me";

type Ctx = { params: Promise<{ id: string }> };
export const DELETE = api<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await removePlace(user.id, (await params).id);
  return getWorld(user.id);
});
