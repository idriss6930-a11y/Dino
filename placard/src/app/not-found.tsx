import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette page n&apos;existe pas, ou l&apos;article a été supprimé.</p>
      <Link href="/" className="btn-primary mt-6">Revenir à l&apos;accueil</Link>
    </div>
  );
}
