import { api } from "@/lib/api";
import { createCheckout } from "@/lib/services/billing";
import { requireUser } from "@/lib/session";

export const POST = api(async () => ({ url: await createCheckout((await requireUser()).id) }), { rate: { name: "checkout", limit: 10, windowMs: 3_600_000 } });
