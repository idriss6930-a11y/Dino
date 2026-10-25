import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deleteTrip } from "@/lib/services/me";

type Ctx = { params: Promise<{ id: string }> };
export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteTrip((await requireUser()).id, (await params).id);
  return { ok: true };
});
