import { z } from "zod";
import { api } from "@/lib/api";
import { requestPasswordReset } from "@/lib/services/auth";

const appUrl = () => (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");

/** Répond toujours la même chose : on ne révèle pas si l'adresse possède un compte. */
export const POST = api(async (req) => {
  const { email } = z.object({ email: z.string().max(254) }).parse(await req.json());
  await requestPasswordReset(email, appUrl());
  return { ok: true };
}, { rate: { name: "forgot", limit: 5, windowMs: 3_600_000 } });
