"use client";
import { EmptyState } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState mood="surprised" title="Oups, un problème est survenu">
        <button type="button" className="btn-primary mt-2" onClick={reset}>
          Réessayer
        </button>
      </EmptyState>
    </div>
  );
}
