import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getMe, updatePrefs } from "@/lib/services/me";

export const GET = api(async () => getMe((await requireUser()).id));

export const PATCH = api(async (req) => {
  const user = await requireUser();
  await updatePrefs(user.id, await req.json());
  return getMe(user.id);
});
