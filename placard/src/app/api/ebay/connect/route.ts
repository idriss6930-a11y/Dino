import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { authorizeUrl, ebayConfigured } from "@/lib/ebay/client";
import { UserFacingError } from "@/lib/services/errors";
import { requireUser } from "@/lib/session";
import { randomToken } from "@/lib/utils/ids";


export const GET = api(async () => {
  await requireUser();
  if (!ebayConfigured()) throw new UserFacingError("La connexion eBay n'est pas activée sur ce site.");
  const state = randomToken(24);
  (await cookies()).set("placard_ebay_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true", path: "/", maxAge: 600 });
  return NextResponse.redirect(authorizeUrl(state));
});
