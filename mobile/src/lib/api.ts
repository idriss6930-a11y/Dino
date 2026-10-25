/**
 * Client de l'API DINO. L'application mobile n'a aucune clé : toutes les données passent par le serveur DINO.
 *
 * Adresse du serveur :
 *  1. EXPO_PUBLIC_DINO_API_URL si elle est définie (ex. https://dino.exemple.com) ;
 *  2. sinon, en développement avec Expo Go : l'ordinateur qui fait tourner Expo, port 3000 (npm run dev de DINO) ;
 *  3. sinon, sur le web : la même origine que la page.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_DINO_API_URL;
  if (env) return env.replace(/\/$/, "");
  if (Platform.OS === "web") return "";
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:3000` : "http://localhost:3000";
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { credentials: "include", ...init, headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  } catch {
    throw new ApiError(`Impossible de joindre le serveur DINO${API_URL ? ` (${API_URL})` : ""}. Vérifiez qu'il est démarré et accessible.`, 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Erreur ${res.status}`, res.status);
  return data as T;
}

export const qs = (o: Record<string, string | number | boolean | undefined | null>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

export const apiGet = <T,>(path: string) => request<T>(path);
export const apiPost = <T,>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });
