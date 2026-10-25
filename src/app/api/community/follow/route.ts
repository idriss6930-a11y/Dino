import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { toggleFollow } from "@/lib/services/community";

export const POST = api(async (req) => {
  const { handle } = z.object({ handle: z.string().max(60) }).parse(await req.json());
  return toggleFollow(await requireUser(), handle);
});
