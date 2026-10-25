import { api, searchParamsToObject } from "@/lib/api";
import { getSessionUser, requireUser } from "@/lib/session";
import { createTip, listTips } from "@/lib/services/community";

export const GET = api(async (req) => listTips(searchParamsToObject(req.nextUrl.searchParams), await getSessionUser()));
export const POST = api(async (req) => createTip(await requireUser(), await req.json()), { rate: { name: "tip-create", limit: 20, windowMs: 3_600_000 } });
