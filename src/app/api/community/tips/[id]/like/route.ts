import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { toggleLike } from "@/lib/services/community";

type Ctx = { params: Promise<{ id: string }> };
export const POST = api<Ctx>(async (_req, { params }) => toggleLike(await requireUser(), (await params).id), { rate: { name: "like", limit: 120, windowMs: 3_600_000 } });
