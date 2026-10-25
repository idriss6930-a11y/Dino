import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { toggleSave } from "@/lib/services/community";

type Ctx = { params: Promise<{ id: string }> };
export const POST = api<Ctx>(async (_req, { params }) => toggleSave(await requireUser(), (await params).id));
