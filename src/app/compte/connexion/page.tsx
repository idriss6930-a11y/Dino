import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForms";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}
