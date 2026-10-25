import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { report } from "@/lib/services/community";

export const POST = api(async (req) => report(await requireUser(), await req.json()), { rate: { name: "report", limit: 30, windowMs: 3_600_000 } });
