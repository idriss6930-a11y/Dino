import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { addComment } from "@/lib/services/community";

type Ctx = { params: Promise<{ id: string }> };
export const POST = api<Ctx>(async (req, { params }) => addComment(await requireUser(), (await params).id, await req.json()), {
  rate: { name: "comment", limit: 30, windowMs: 3_600_000 },
});
