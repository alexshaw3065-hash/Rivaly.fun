// What the tracking endpoint accepts — pure, tested (sanitize.test.ts).
// No personal data gets through: event names are a fixed shape, paths lose
// their query string (which can carry invite codes), props keep only short
// primitives under safe keys.

export const EVENT_NAME = /^[a-z][a-z0-9_]{1,48}$/;
const PROP_KEY = /^[a-z][a-z0-9_]{0,31}$/;
const ID = /^[A-Za-z0-9_-]{8,64}$/;
export const MAX_EVENTS = 25;

export interface CleanEvent {
  event: string;
  path: string | null;
  props: Record<string, string | number | boolean>;
  at: string;
}

export function cleanId(v: unknown): string | null {
  return typeof v === "string" && ID.test(v) ? v : null;
}

export function cleanPath(v: unknown): string | null {
  if (typeof v !== "string" || !v.startsWith("/")) return null;
  const path = v.split(/[?#]/)[0].slice(0, 200);
  // Room/profile/post ids are fine (not personal); anything that looks like an email is not.
  return /@[^/]*\./.test(path) ? null : path;
}

export function cleanProps(v: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  let n = 0;
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (n >= 12 || !PROP_KEY.test(k)) continue;
    if (typeof raw === "number" && Number.isFinite(raw)) out[k] = raw;
    else if (typeof raw === "boolean") out[k] = raw;
    else if (typeof raw === "string" && raw.length <= 120 && !/@[^\s]+\./.test(raw)) out[k] = raw;
    else continue;
    n++;
  }
  return out;
}

/** Client timestamps are trusted only within a small window (clock skew, queued events). */
export function cleanTime(v: unknown, now = Date.now()): string {
  const t = typeof v === "number" ? v : NaN;
  return Number.isFinite(t) && t <= now + 60_000 && t >= now - 24 * 3600_000 ? new Date(t).toISOString() : new Date(now).toISOString();
}

export function cleanEvents(v: unknown, now = Date.now()): CleanEvent[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, MAX_EVENTS)
    .map((e) => (e && typeof e === "object" ? (e as Record<string, unknown>) : {}))
    .filter((e) => typeof e.e === "string" && EVENT_NAME.test(e.e))
    .map((e) => ({ event: e.e as string, path: cleanPath(e.p), props: cleanProps(e.props), at: cleanTime(e.t, now) }));
}

export function deviceFrom(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

export function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegrambot|discordbot/i.test(ua);
}

export function hostOf(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  try {
    return new URL(v).hostname.replace(/^www\./, "").slice(0, 120) || null;
  } catch {
    return null;
  }
}

export function short(v: unknown, max = 80): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
