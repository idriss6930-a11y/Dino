import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { connectEbay, ebayConfigured } from "@/lib/ebay/client";
import { log } from "@/lib/log";
import { getSessionUser } from "@/lib/session";

const back = (result: string) => NextResponse.redirect(`${(process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "")}/app/compte?ebay=${result}`);

/** Retour d'eBay après autorisation. Le paramètre state doit correspondre au cookie posé au départ. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const jar = await cookies();
  const expected = jar.get("placard_ebay_state")?.value;
  jar.delete("placard_ebay_state");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!user || !ebayConfigured() || !code || !expected || state !== expected) return back("refuse");
  try {
    await connectEbay(user.id, code);
    return back("ok");
  } catch (e) {
    log.warn("ebay_connect_failed", { error: e instanceof Error ? e.message : String(e) });
    return back("erreur");
  }
}
