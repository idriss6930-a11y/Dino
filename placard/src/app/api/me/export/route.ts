import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { exportUserData } from "@/lib/services/auth";
import { requireUser } from "@/lib/session";

export const GET = api(async () => {
  const data = await exportUserData((await requireUser()).id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="placard-mes-donnees.json"' },
  });
});
