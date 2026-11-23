import { api } from "@/lib/api";
import { createItem } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

export const POST = api(async (req) => {
  const item = await createItem(await requireUser(), await req.json());
  return { id: item.id };
}, { rate: { name: "item-create", limit: 60, windowMs: 3_600_000 } });
