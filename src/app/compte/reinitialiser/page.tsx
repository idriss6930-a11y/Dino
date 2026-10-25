import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetForm } from "@/components/AuthForms";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetForm />
    </Suspense>
  );
}
