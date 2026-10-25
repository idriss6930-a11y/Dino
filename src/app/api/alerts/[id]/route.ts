import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deleteAlert, updateAlert } from "@/lib/services/alerts";

type Ctx = { params: Promise<{ id: string }> };
const patchSchema = z.object({
  active: z.boolean().optional(),
  channels: z.object({ inApp: z.boolean(), email: z.boolean(), push: z.boolean() }).optional(),
});

export const PATCH = api<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  await updateAlert(user.id, (await params).id, patchSchema.parse(await req.json()));
  return { ok: true };
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await deleteAlert(user.id, (await params).id);
  return { ok: true };
});
