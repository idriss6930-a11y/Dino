import { api } from "@/lib/api";
import { getSessionUser, requireUser } from "@/lib/session";
import { deleteOwnTip, getTip } from "@/lib/services/community";

type Ctx = { params: Promise<{ id: string }> };
export const GET = api<Ctx>(async (_req, { params }) => getTip((await params).id, await getSessionUser()));
export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteOwnTip(await requireUser(), (await params).id);
  return { ok: true };
});
