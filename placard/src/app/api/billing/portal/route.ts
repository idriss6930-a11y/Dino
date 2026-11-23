import { api } from "@/lib/api";
import { createPortal } from "@/lib/services/billing";
import { requireUser } from "@/lib/session";

export const POST = api(async () => ({ url: await createPortal((await requireUser()).id) }));
