import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { ebayCanPublish } from "@/lib/ebay/client";
import { aiConfigured } from "@/lib/listing/claude";
import { billingConfigured } from "@/lib/services/billing";

/** État du service : ce qui est réellement branché, sans aucun secret. */
export async function GET() {
  await getDb();
  return NextResponse.json({ ok: true, ai: aiConfigured(), ebay: ebayCanPublish(), billing: billingConfigured(), mail: Boolean(process.env.SMTP_URL) });
}
