import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ModerationQueue } from "@/components/ModerationQueue";
import { getSessionUser } from "@/lib/session";
import { moderationQueue } from "@/lib/services/community";

export const metadata: Metadata = { title: "Modération", robots: { index: false } };

export default async function ModerationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/compte/connexion?next=/moderation");
  if (user.role === "user") notFound();
  const q = await moderationQueue();
  return (
    <>
      <PageHeader title="Modération" subtitle="Contenus retenus par le filtre automatique et signalements des voyageurs." mood="thinking" />
      <ModerationQueue pending={JSON.parse(JSON.stringify(q.pending))} reports={JSON.parse(JSON.stringify(q.openReports))} />
    </>
  );
}
