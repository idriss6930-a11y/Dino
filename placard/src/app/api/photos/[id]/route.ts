import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { NotFoundError } from "@/lib/services/errors";
import { deletePhoto, readPhoto } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/** Lecture sans connexion : l'identifiant est un jeton aléatoire de 192 bits, qui fait office de clé. */
export const GET = api<Ctx>(async (_req, { params }) => {
  const photo = await readPhoto((await params).id);
  if (!photo) throw new NotFoundError("Photo introuvable");
  return new NextResponse(new Uint8Array(photo.bytes), { headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deletePhoto((await requireUser()).id, (await params).id);
  return { ok: true };
});
