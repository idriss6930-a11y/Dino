/** Journal technique structuré. Les champs sensibles sont masqués avant écriture : aucune clé ni mot de passe. */
const SENSITIVE = /pass|secret|token|key|authorization|cookie|session|email/i;

function redact(v: unknown, depth = 0): unknown {
  if (depth > 4 || v == null) return v;
  if (typeof v === "string") return v.replace(/(Bearer\s+)[\w.-]+/gi, "$1***").replace(/([?&](token|key|api_key|marker)=)[^&\s]+/gi, "$1***");
  if (Array.isArray(v)) return v.map((x) => redact(x, depth + 1));
  if (typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, SENSITIVE.test(k) ? "***" : redact(x, depth + 1)]));
  }
  return v;
}

function write(level: "info" | "warn" | "error", msg: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(data ? (redact(data) as object) : {}) });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, data?: Record<string, unknown>) => write("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => write("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => write("error", msg, data),
  redact,
};
