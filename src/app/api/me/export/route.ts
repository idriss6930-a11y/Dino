import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { exportUserData } from "@/lib/services/auth";

export const GET = api(async () => {
  const user = await requireUser();
  const data = await exportUserData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="dino-export-${user.handle}.json"`, "Cache-Control": "no-store" },
  });
}, { rate: { name: "export", limit: 5, windowMs: 3_600_000 } });
