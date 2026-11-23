import { api } from "@/lib/api";
import { deleteItem, updateItem } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = api<Ctx>(async (req, { params }) => {
  return { item: await updateItem((await requireUser()).id, (await params).id, await req.json()) };
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteItem((await requireUser()).id, (await params).id);
  return { ok: true };
});
