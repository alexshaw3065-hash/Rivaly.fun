// Big Balls Data REST client. Server-only: the key never reaches a browser.
// Every call is counted against the day so the governor (logic.ts) can pace
// polling; the provider's own counters are re-read once a day at start.

export const BB_BASE = "https://api.bigballsdata.com";

export class BbError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfterS: number | null = null,
  ) {
    super(message);
  }
}

// Per-process usage for the current UTC day. One process polls (the Render
// worker), so this is the count that matters; `sync` re-reads the
// provider's own number whenever the day changes.
const usage = { day: "", used: 0, synced: false, pausedUntil: 0 };

const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

function rollDay() {
  const d = utcDay();
  if (usage.day !== d) {
    usage.day = d;
    usage.used = 0;
    usage.synced = false;
  }
}

export function usedToday(): number {
  rollDay();
  return usage.used;
}

/** True while a 429 told us to stop (quota gone, or the provider's 4xx cooldown). */
export function isPaused(): boolean {
  return Date.now() < usage.pausedUntil;
}

export async function bbGet<T>(path: string, key: string): Promise<T> {
  rollDay();
  if (isPaused()) throw new BbError(429, "paused after a rate limit");
  // Validated before sending: a malformed request is a 4xx, 4xx count against
  // the quota, and enough of them trip the provider's 10-minute lockout.
  if (!/^\/v1\/[a-z0-9/_-]+(\?[a-z0-9_=&.-]*)?$/i.test(path)) throw new BbError(400, `refusing malformed path ${path}`);
  const res = await fetch(`${BB_BASE}${path}`, { headers: { "x-api-key": key.trim(), accept: "application/json" } });
  usage.used += 1;
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? "60");
    // A daily-quota 429 means nothing until midnight UTC; a per-minute or
    // cooldown one says how long. Never hammer past it.
    const body = await res.text().catch(() => "");
    const daily = /daily/i.test(body);
    const tomorrow = Date.parse(`${utcDay()}T00:00:00Z`) + 86_400_000;
    usage.pausedUntil = daily ? tomorrow : Date.now() + Math.max(retry, 30) * 1000;
    throw new BbError(429, daily ? "daily quota used up" : "rate limited", retry);
  }
  if (!res.ok) throw new BbError(res.status, `${path} → ${res.status}`);
  const json = (await res.json()) as { data?: T };
  if (json.data === undefined) throw new BbError(502, `${path} → no data`);
  return json.data;
}

/** Once per UTC day: the provider's own count of what we've used (1 call). */
export async function syncUsage(key: string): Promise<void> {
  rollDay();
  if (usage.synced) return;
  const u = await bbGet<{ used_today?: number }>("/v1/usage", key);
  if (typeof u.used_today === "number") usage.used = Math.max(usage.used, u.used_today);
  usage.synced = true;
}
