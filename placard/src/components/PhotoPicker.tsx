"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_PHOTOS } from "@/lib/listing/constants";

/** Sélection de photos avant création de l'article : aperçu local, rien n'est encore envoyé. */
export function PhotoPicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <li key={u} className="relative size-24 overflow-hidden rounded-lg border border-line bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            <button type="button" aria-label={`Retirer la photo ${i + 1}`} className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-ink/80 text-white" onClick={() => onChange(files.filter((_, j) => j !== i))}>
              <X size={14} />
            </button>
          </li>
        ))}
        {files.length < MAX_PHOTOS && (
          <li>
            <button type="button" className="grid size-24 place-items-center rounded-lg border border-dashed border-muted/50 bg-white text-muted hover:border-denim-600 hover:text-denim-600" onClick={() => input.current?.click()}>
              <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                <ImagePlus size={22} aria-hidden />
                Ajouter
              </span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Ajouter des photos"
        onChange={(e) => {
          onChange([...files, ...Array.from(e.target.files ?? [])].slice(0, MAX_PHOTOS));
          e.target.value = "";
        }}
      />
      <p className="hint mt-2">{MAX_PHOTOS} photos au plus. Elles sont réduites sur votre appareil avant l&apos;envoi.</p>
    </div>
  );
}
