import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/AuthForms";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Inscription", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <RegisterForm />
    </Suspense>
  );
}
