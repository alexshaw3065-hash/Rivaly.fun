// Server-only TxLINE client. Never import from a client component: the API
// token is an app-level credential tied to Rivaly's on-chain subscription,
// not a per-user secret.
//
// Auth is two headers: a short-lived guest JWT and the long-lived API token
// issued by the on-chain subscription. Rather than persist and refresh the
// JWT, every run acquires a fresh one — /auth/guest/start is free and
// unauthenticated, so this removes all expiry handling for the cost of one
// request per sync.
const DEVNET_BASE = "https://txline-dev.txodds.com";

const API_BASE = `${process.env.TXLINE_BASE_URL ?? DEVNET_BASE}/api`;
const JWT_URL = `${process.env.TXLINE_BASE_URL ?? DEVNET_BASE}/auth/guest/start`;

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

  return {
    jwt,
    apiToken,
    async get<T>(path: string): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, { headers, cache: "no-store" });
      if (!res.ok) {
        const body = await res.text();
        // 403 means the competition isn't in our bundle — an expected,
        // routine answer for most of the catalogue, not a fault.
        throw new TxLineError(`GET ${path} -> ${res.status}: ${body.slice(0, 200)}`, res.status);
      }
      return (await res.json()) as T;
    },
  };
}

/** Days since the Unix epoch, which is how TxLINE windows its queries. */
export function epochDay(at: Date = new Date()): number {
  return Math.floor(at.getTime() / 86_400_000);
}
