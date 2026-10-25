import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotForm } from "@/components/AuthForms";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ForgotForm />
    </Suspense>
  );
}
