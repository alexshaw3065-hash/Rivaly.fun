// Server-only TxLINE client. Never import from a client component: the API
// token is an app-level credential tied to Rivaly's on-chain subscription,
// not a per-user secret.
//
// Auth is two headers: a short-lived guest JWT and the long-lived API token
// issued by the on-chain subscription. Rather than persist and refresh the
// JWT, every run acquires a fresh one — /auth/guest/start is free and
// unauthenticated, so this removes all expiry handling for the cost of one
// request per sync.
import type { TxLineScores } from "./types";

const DEVNET_BASE = "https://txline-dev.txodds.com";

const API_BASE = `${process.env.TXLINE_BASE_URL ?? DEVNET_BASE}/api`;
const JWT_URL = `${process.env.TXLINE_BASE_URL ?? DEVNET_BASE}/auth/guest/start`;

const HISTORICAL_TIMEOUT_MS = 15_000;

export class TxLineError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TxLineError";
  }
}

async function getGuestJwt(): Promise<string> {
  const res = await fetch(JWT_URL, { method: "POST", cache: "no-store" });
  if (!res.ok) throw new TxLineError(`guest auth failed: ${res.status}`, res.status);
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new TxLineError("guest auth returned no token", 500);
  return json.token;
}

export interface TxLineSession {
  get<T>(path: string): Promise<T>;
  /** Every record TxLINE has for a fixture — see scoreRecords(). */
  scoreRecords(fixtureId: number): Promise<TxLineScores[]>;
  jwt: string;
  apiToken: string;
}

export async function openSession(): Promise<TxLineSession> {
  const apiToken = process.env.TXLINE_API_TOKEN;
  if (!apiToken) throw new TxLineError("TXLINE_API_TOKEN is not configured", 500);

  const jwt = await getGuestJwt();
  const headers = {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
  };

  async function raw(path: string, signal?: AbortSignal): Promise<Response> {
    const res = await fetch(`${API_BASE}${path}`, { headers, cache: "no-store", signal });
    if (!res.ok) {
      const body = await res.text();
      // 403 means the competition isn't in our bundle — an expected,
      // routine answer for most of the catalogue, not a fault.
      throw new TxLineError(`GET ${path} -> ${res.status}: ${body.slice(0, 200)}`, res.status);
    }
    return res;
  }

  return {
    jwt,
    apiToken,
    async get<T>(path: string): Promise<T> {
      return (await (await raw(path)).json()) as T;
    },
    async scoreRecords(fixtureId: number): Promise<TxLineScores[]> {
      // The snapshot keeps only the latest record of each action — one goal,
      // one card, one substitution per match, however many there were. The
      // historical log keeps every record (every goal, every scorer, the
      // line-ups), so it leads; the snapshot fills in anything newer the log
      // hasn't caught up with yet. Union by Seq.
      const [log, snap] = await Promise.allSettled([
        // It answers as an event stream; if one ever stays open (a live
        // match), give up after a while and let the snapshot stand.
        raw(`/scores/historical/${fixtureId}`, AbortSignal.timeout(HISTORICAL_TIMEOUT_MS)).then(async (r) => parseEventStream(await r.text())),
        raw(`/scores/snapshot/${fixtureId}`).then((r) => r.json() as Promise<TxLineScores[]>),
      ]);
      if (log.status === "rejected" && snap.status === "rejected") throw snap.reason;
      const bySeq = new Map<number, TxLineScores>();
      for (const r of [...(log.status === "fulfilled" ? log.value : []), ...(snap.status === "fulfilled" && Array.isArray(snap.value) ? snap.value : [])])
        if (typeof r?.Seq === "number" && !bySeq.has(r.Seq)) bySeq.set(r.Seq, r);
      return [...bySeq.values()];
    },
  };
}

/** The historical endpoint answers as a server-sent event stream: one "data:" line per record. */
export function parseEventStream(text: string): TxLineScores[] {
  const out: TxLineScores[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    try {
      out.push(JSON.parse(line.slice(5)) as TxLineScores);
    } catch {
      // A malformed line is skipped, not fatal — the snapshot backs it up.
    }
  }
  return out;
}

/** Days since the Unix epoch, which is how TxLINE windows its queries. */
export function epochDay(at: Date = new Date()): number {
  return Math.floor(at.getTime() / 86_400_000);
}
