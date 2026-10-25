/**
 * Envoi d'e-mails via SMTP (SMTP_URL, ex. smtps://user:pass@smtp.exemple.com:465 ; MAIL_FROM).
 * Sans configuration : en développement, le message est écrit dans le terminal du serveur (jamais en production).
 */
import { log } from "@/lib/log";

export type MailResult = "sent" | "logged" | "not_configured" | "failed";

export async function sendMail(to: string, subject: string, text: string): Promise<MailResult> {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[DINO mail — développement, non envoyé]\nÀ : ${to}\nObjet : ${subject}\n\n${text}\n`);
      return "logged";
    }
    return "not_configured";
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport(url);
    await transport.sendMail({ from: process.env.MAIL_FROM ?? "DINO <no-reply@dino.travel>", to, subject, text });
    return "sent";
  } catch (e) {
    log.error("mail_failed", { error: e instanceof Error ? e.message : String(e) });
    return "failed";
  }
}
