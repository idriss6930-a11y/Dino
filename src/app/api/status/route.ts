import { api } from "@/lib/api";
import { aiConfigured, flightDataMode, hotelDataMode, flightProviders, hotelProviders } from "@/lib/providers/registry";
import { pushConfigured } from "@/lib/services/notifications";
import { dbEngine } from "@/lib/db/client";

/** État des connexions, sans jamais exposer de clé : uniquement « configuré » ou non. */
export const GET = api(async () => ({
  flights: { mode: flightDataMode(), providers: flightProviders().filter((p) => p.isConfigured()).map((p) => ({ id: p.id, name: p.name, isDemo: p.isDemo })) },
  hotels: { mode: hotelDataMode(), providers: hotelProviders().filter((p) => p.isConfigured()).map((p) => ({ id: p.id, name: p.name, isDemo: p.isDemo })) },
  ai: aiConfigured(),
  email: !!process.env.SMTP_URL,
  push: pushConfigured(),
  database: dbEngine(),
}));
