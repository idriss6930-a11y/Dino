import { api } from "@/lib/api";
import { generateForItem } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/** La rédaction par IA peut prendre plusieurs dizaines de secondes. */
export const maxDuration = 120;

export const POST = api<Ctx>(async (_req, { params }) => {
  return generateForItem(await requireUser(), (await params).id);
}, { rate: { name: "generate", limit: 30, windowMs: 600_000 } });
