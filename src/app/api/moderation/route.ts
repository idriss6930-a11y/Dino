import { api } from "@/lib/api";
import { requireModerator } from "@/lib/session";
import { moderate, moderationQueue } from "@/lib/services/community";

export const GET = api(async () => {
  await requireModerator();
  return moderationQueue();
});

export const POST = api(async (req) => moderate(await requireModerator(), await req.json()));
