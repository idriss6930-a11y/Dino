import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { checkAlert, listAlerts } from "@/lib/services/alerts";
import { NotFoundError } from "@/lib/services/errors";

type Ctx = { params: Promise<{ id: string }> };

/** Vérification immédiate à la demande (limitée pour respecter les quotas des fournisseurs). */
export const POST = api<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!(await listAlerts(user.id)).some((a) => a.id === id)) throw new NotFoundError();
  return checkAlert(id);
}, { rate: { name: "alert-check", limit: 6, windowMs: 3_600_000 } });
