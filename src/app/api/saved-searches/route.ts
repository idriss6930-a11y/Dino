import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { listSavedSearches, saveSearch } from "@/lib/services/me";

export const GET = api(async () => ({ searches: await listSavedSearches((await requireUser()).id) }));
export const POST = api(async (req) => saveSearch((await requireUser()).id, await req.json()));
