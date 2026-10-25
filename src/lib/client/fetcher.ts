/** Appels API côté navigateur : JSON, même origine, erreurs lisibles. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Erreur ${res.status}`, res.status);
  return data as T;
}

export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  return handle<T>(await fetch(url, { signal, headers: { Accept: "application/json" } }));
}

export async function apiSend<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

/** Construit une query string en ignorant les valeurs vides. */
export function qs(params: Record<string, string | number | boolean | undefined | null | string[]>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else sp.set(k, String(v));
  }
  return sp.toString();
}
