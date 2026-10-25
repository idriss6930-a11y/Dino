import { z } from "zod";
import { api } from "@/lib/api";
import { requestPasswordReset } from "@/lib/services/auth";

const schema = z.object({ email: z.string().max(254) });

/** Réponse identique que le compte existe ou non (pas d'énumération des comptes). */
export const POST = api(async (req) => {
  const { email } = schema.parse(await req.json());
  await requestPasswordReset(email, process.env.APP_URL ?? req.nextUrl.origin);
  return { ok: true, message: "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé." };
}, { rate: { name: "forgot", limit: 5, windowMs: 3_600_000 } });
