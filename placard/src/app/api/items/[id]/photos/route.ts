import { api } from "@/lib/api";
import { UserFacingError } from "@/lib/services/errors";
import { MAX_PHOTO_BYTES } from "@/lib/services/images";
import { addPhoto } from "@/lib/services/items";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const POST = api<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  if (Number(req.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES + 100_000) throw new UserFacingError("Photo trop lourde (1,5 Mo au plus après réduction).");
  const file = (await req.formData()).get("photo");
  if (!(file instanceof Blob)) throw new UserFacingError("Aucune photo reçue.");
  return addPhoto(user.id, (await params).id, new Uint8Array(await file.arrayBuffer()));
}, { rate: { name: "photo", limit: 120, windowMs: 3_600_000 } });
