import clsx from "clsx";
import type { ListingDTO } from "@/lib/listing/dto";

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" | "ok" }) {
  return (
    <div
      role={tone === "warn" ? "alert" : "status"}
      className={clsx(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "info" && "border-denim-100 bg-denim-50 text-denim-900",
        tone === "warn" && "border-tag-500/30 bg-tag-50 text-tag-700",
        tone === "ok" && "border-leaf-700/20 bg-leaf-50 text-leaf-700",
      )}
    >
      {children}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <Notice tone="warn">{message}</Notice> : null;
}

const LISTING_STATUS: Record<ListingDTO["status"], { label: string; cls: string }> = {
  online: { label: "en ligne", cls: "bg-denim-50 text-denim-700 border-denim-100" },
  to_remove: { label: "à retirer", cls: "bg-tag-50 text-tag-700 border-tag-500/40" },
  removed: { label: "retirée", cls: "bg-paper text-muted border-line" },
  sold: { label: "vendu ici", cls: "bg-leaf-50 text-leaf-700 border-leaf-700/20" },
};

export function ListingPill({ label, status }: { label: string; status: ListingDTO["status"] }) {
  const s = LISTING_STATUS[status];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", s.cls)}>
      {label} · {s.label}
    </span>
  );
}

export const ITEM_STATUS = { draft: "Brouillon", online: "En ligne", sold: "Vendu", archived: "Archivé" } as const;

/** Étiquette de prix, comme celle qu'on accroche à un vêtement. */
export function PriceTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex shrink-0 items-center whitespace-nowrap rounded-r-md rounded-l-sm bg-tag-500 py-0.5 pr-2 pl-4 text-sm font-bold text-white tabular-nums">
      <span aria-hidden className="absolute left-1.5 size-1.5 rounded-full bg-white/90" />
      {children}
    </span>
  );
}
