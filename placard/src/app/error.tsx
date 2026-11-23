"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-3xl font-bold">Une erreur est survenue</h1>
      <p className="mt-2 text-muted">Vos données ne sont pas perdues. Réessayez ; si le problème persiste, rechargez la page.</p>
      <button className="btn-primary mt-6" onClick={reset}>Réessayer</button>
    </div>
  );
}
