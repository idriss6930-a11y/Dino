import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState mood="surprised" title="DINO s'est perdu…">
        Cette page n&apos;existe pas ou n&apos;est pas accessible.{" "}
        <Link href="/" className="underline">
          Retour à l&apos;accueil
        </Link>
      </EmptyState>
    </div>
  );
}
