/** Réduit une photo dans le navigateur avant l'envoi : 1600 px au plus, JPEG, sous la limite de poids. */
import { MAX_PHOTO_BYTES } from "@/lib/listing/constants";

export async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error(`« ${file.name} » n'est pas une image lisible.`);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new Error(`« ${file.name} » reste trop lourde après réduction.`);
}

export async function uploadPhoto(itemId: string, file: File): Promise<string> {
  const body = new FormData();
  body.append("photo", await shrinkPhoto(file), "photo.jpg");
  const res = await fetch(`/api/items/${itemId}/photos`, { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !data.id) throw new Error(data.error ?? "L'envoi de la photo a échoué.");
  return data.id;
}
