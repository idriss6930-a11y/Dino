import { api } from "@/lib/api";
import { withdrawFromEbay } from "@/lib/ebay/client";
import { cancelSale, markSold } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const POST = api<Ctx>(async (req, { params }) => {
  return markSold((await requireUser()).id, (await params).id, await req.json(), withdrawFromEbay);
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  return cancelSale((await requireUser()).id, (await params).id);
});
