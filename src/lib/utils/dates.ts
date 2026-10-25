/**
 * Dates de voyage : on manipule des dates calendaires "YYYY-MM-DD" (sans fuseau) pour les jours de voyage,
 * et des instants ISO avec fuseau IANA pour les horaires de vol. Ne jamais convertir une date de voyage
 * en Date locale du serveur : cela décale d'un jour selon le fuseau.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Nombre de jours entre deux dates calendaires (b - a). */
export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Date calendaire du jour dans un fuseau donné (par défaut Europe/Paris). */
export function todayIn(timeZone = "Europe/Paris", now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = dimanche
}

/** Décalage (minutes) d'un fuseau IANA à un instant donné. */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Convertit une heure locale "YYYY-MM-DDTHH:mm" d'un fuseau en instant UTC. */
export function localToUtc(local: string, timeZone: string): Date {
  const [datePart, timePart = "00:00"] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off1 = tzOffsetMinutes(timeZone, guess);
  const first = new Date(guess.getTime() - off1 * 60000);
  const off2 = tzOffsetMinutes(timeZone, first);
  return off1 === off2 ? first : new Date(guess.getTime() - off2 * 60000);
}

/** Heure locale "YYYY-MM-DDTHH:mm" d'un instant dans un fuseau. */
export function utcToLocal(at: Date, timeZone: string): string {
  const off = tzOffsetMinutes(timeZone, at);
  return new Date(at.getTime() + off * 60000).toISOString().slice(0, 16);
}

/** Différence de jours calendaires entre départ et arrivée (heures locales) : +1, +2, -1… */
export function dayShift(departLocal: string, arriveLocal: string): number {
  return daysBetween(departLocal.slice(0, 10), arriveLocal.slice(0, 10));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}

export function formatDateFr(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatRelative(at: Date | string, now = new Date()): string {
  const t = typeof at === "string" ? new Date(at) : at;
  const s = Math.round((now.getTime() - t.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
