import { api } from "@/lib/api";
import { setListing } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const POST = api<Ctx>(async (req, { params }) => {
  return setListing((await requireUser()).id, (await params).id, await req.json());
});
