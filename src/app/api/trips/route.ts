import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { createTrip, listTrips } from "@/lib/services/me";

export const GET = api(async () => ({ trips: await listTrips((await requireUser()).id) }));
export const POST = api(async (req) => createTrip((await requireUser()).id, await req.json()));
