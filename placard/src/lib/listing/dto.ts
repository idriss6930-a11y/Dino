/** Formes envoyées au navigateur (dates en texte). Types seulement : rien n'est importé côté client. */
import type { Condition, PlatformId } from "./constants";
import type { Audience } from "./types";

export type ItemDTO = {
  id: string;
  kind: string; brand: string; size: string; color: string; material: string;
  audience: Audience; condition: Condition; defects: string; notes: string;
  purchaseCents: number | null;
  title: string; description: string; hashtags: string[]; priceCents: number | null;
  writtenBy: "manual" | "rules" | "claude";
  estimateLowCents: number | null; estimateHighCents: number | null; estimateNote: string;
  status: "draft" | "online" | "sold" | "archived";
  soldPlatform: PlatformId | "other" | null;
  soldCents: number | null; soldFeesCents: number | null; soldShippingCents: number | null;
  soldAt: string | null;
};

export type ListingDTO = { platform: PlatformId; status: "online" | "to_remove" | "removed" | "sold"; via: "manual" | "api"; externalUrl: string | null };

export type ItemBundle = { item: ItemDTO; listings: ListingDTO[]; photoIds: string[] };

/** Passe un objet serveur (avec des Date) au format transmissible à un composant client. */
export const plain = <T,>(v: unknown): T => JSON.parse(JSON.stringify(v)) as T;
