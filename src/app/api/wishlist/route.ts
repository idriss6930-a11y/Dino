import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { listWishlist, toggleWishlist } from "@/lib/services/me";

export const GET = api(async () => ({ items: await listWishlist((await requireUser()).id) }));

export const POST = api(async (req) => {
  const user = await requireUser();
  const { slug } = z.object({ slug: z.string().max(60) }).parse(await req.json());
  return toggleWishlist(user.id, slug);
});
