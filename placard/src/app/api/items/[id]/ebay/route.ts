import { api } from "@/lib/api";
import { publishToEbay } from "@/lib/ebay/client";
import { getItem, setListing } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 60;

/** Publie l'article sur eBay par l'API officielle, puis enregistre l'annonce comme « en ligne ». */
export const POST = api<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { item } = await getItem(user.id, id);
  const published = await publishToEbay(user.id, item);
  return setListing(user.id, id, { platform: "ebay", status: "online" }, published);
}, { rate: { name: "ebay-publish", limit: 30, windowMs: 3_600_000 } });
