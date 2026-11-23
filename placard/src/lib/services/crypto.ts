/** Chiffrement des secrets tiers stockés en base (jetons eBay) : AES-256-GCM, clé dérivée de APP_SECRET. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.APP_SECRET ?? "";
  if (secret.length < 32) throw new Error("APP_SECRET doit contenir au moins 32 caractères pour chiffrer des jetons.");
  return createHash("sha256").update(secret).digest();
}

export const hasAppSecret = () => (process.env.APP_SECRET ?? "").length >= 32;

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(enc: string): string {
  const [v, iv, tag, data] = enc.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Secret chiffré illisible");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
