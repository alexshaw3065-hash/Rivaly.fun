import { createServer } from "node:http";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyScores } from "../../src/lib/txline/apply-scores";
import type { TxLineScores } from "../../src/lib/txline/types";
import { consumeSse, SseHttpError } from "./sse";

// Always-on consumer of TxLINE's scores stream.
//
// Runs as an HTTP *web service*, not a background worker, because Render's
// free tier offers no background workers and sleeps idle web services — so an
// external pinger keeps this awake by hitting /health, which doubles as a
// liveness readout rather than being a bare keep-alive target.
//
// The stream has no Last-Event-ID, so a reconnect cannot resume. Every
// (re)connect therefore backfills from snapshots before trusting the stream
// again. That isn't belt-and-braces: free instances get recycled, and the gap
// lands exactly when it hurts — mid-match.

const BASE = process.env.TXLINE_BASE_URL ?? "https://txline-dev.txodds.com";
const STREAM_URL = `${BASE}/api/scores/stream`;
const JWT_URL = `${BASE}/auth/guest/start`;
const API_BASE = `${BASE}/api`;

// TxLINE heartbeats while idle, so silence this long means a dead socket.
const STALL_TIMEOUT_MS = 90_000;
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000, 60_000];
const PORT = Number(process.env.PORT ?? 8080);

interface TrackedMatch {
  id: string;
  sport_id: number;
  provider_fixture_id: number;
}

const state = {
  connected: false,
  startedAt: new Date().toISOString(),
  lastEventAt: null as string | null,
  lastActivityAt: null as string | null,
  messages: 0,
  applied: 0,
  reconnects: 0,
  backfills: 0,
  lastError: null as string | null,
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function db(): SupabaseClient {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function guestJwt(): Promise<string> {
  const res = await fetch(JWT_URL, { method: "POST" });
  if (!res.ok) throw new Error(`guest auth failed: ${res.status}`);
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Error("guest auth returned no token");
  return json.token;
}

/** Matches worth following right now: kicked off recently or about to. */
async function activeMatches(supabase: SupabaseClient): Promise<Map<number, TrackedMatch>> {
  const now = Date.now();
  const { data, error } = await supabase
    .from("matches")
    .select("id, sport_id, provider_fixture_id, competition_id")
    .in("status", ["scheduled", "live"])
    .gte("kickoff_at", new Date(now - 6 * 3600_000).toISOString())
    .lte("kickoff_at", new Date(now + 6 * 3600_000).toISOString());
  if (error) throw new Error(`could not load active matches: ${error.message}`);

  const map = new Map<number, TrackedMatch>();
  for (const row of data ?? []) {
    map.set(row.provider_fixture_id as number, {
      id: row.id as string,
      sport_id: row.sport_id as number,
      provider_fixture_id: row.provider_fixture_id as number,
    });
  }
  return map;
}

/**
 * Re-read snapshots for every active match. Run on connect and reconnect,
 * since the stream can't replay what was missed while we were away.
 */
async function backfill(
  supabase: SupabaseClient,
  jwt: string,
  apiToken: string,
  matches: Map<number, TrackedMatch>,
): Promise<void> {
  state.backfills += 1;
  const headers = { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken };
  for (const match of matches.values()) {
    try {
      const res = await fetch(`${API_BASE}/scores/snapshot/${match.provider_fixture_id}`, { headers });
      if (!res.ok) continue;
      const records = (await res.json()) as TxLineScores[];
      if (!Array.isArray(records) || records.length === 0) continue;
      await applyScores(supabase, { id: match.id, sport_id: match.sport_id }, records);
    } catch (e) {
      // Never let one fixture stop the backfill; the stream is the primary
      // path and the scheduled sync-scores route is a further backstop.
      console.warn(`[backfill] fixture ${match.provider_fixture_id}:`, (e as Error).message);
    }
  }
}

async function runOnce(supabase: SupabaseClient): Promise<"closed" | "stalled" | "aborted"> {
  const apiToken = requireEnv("TXLINE_API_TOKEN");
  const jwt = await guestJwt();

  let matches = await activeMatches(supabase);
  await backfill(supabase, jwt, apiToken, matches);
  let matchesLoadedAt = Date.now();

  state.connected = true;
  console.log(`[stream] connected, following ${matches.size} active fixture(s)`);

  try {
    return await consumeSse({
      url: STREAM_URL,
      headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
      stallTimeoutMs: STALL_TIMEOUT_MS,
      onActivity: () => {
        state.lastActivityAt = new Date().toISOString();
      },
      onMessage: async (msg) => {
        state.messages += 1;
        state.lastEventAt = new Date().toISOString();

        let record: TxLineScores;
        try {
          record = JSON.parse(msg.data) as TxLineScores;
        } catch {
          return; // non-JSON payloads are informational
        }
        if (typeof record.FixtureId !== "number") return;

        // The set of live fixtures drifts as matches start and finish.
        if (Date.now() - matchesLoadedAt > 5 * 60_000) {
          matches = await activeMatches(supabase);
          matchesLoadedAt = Date.now();
        }

        const match = matches.get(record.FixtureId);
        if (!match) return; // a fixture we don't track

        // A single streamed record is enough to advance state: applyScores
        // normalises whatever it's given, and the periodic backfill plus the
        // scheduled route repair anything a lone record can't express.
        await applyScores(supabase, { id: match.id, sport_id: match.sport_id }, [record]);
        state.applied += 1;
      },
    });
  } finally {
    state.connected = false;
  }
}

async function main(): Promise<void> {
  const supabase = db();

  createServer((req, res) => {
    // Liveness: 200 whenever the process is up, regardless of stream state.
    // This is what the platform health check must use — pointing it at
    // /health would make Render restart the worker during any normal
    // reconnect, since that briefly reports unhealthy, and a flapping stream
    // would turn into a restart loop.
    if (req.url?.startsWith("/live")) {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }
    if (req.url?.startsWith("/health")) {
      // Readiness: reports real connection state, so an uptime monitor
      // pointed here alerts on a broken stream instead of merely keeping the
      // instance awake. Intentionally 503 when disconnected.
      const healthy = state.connected;
      res.writeHead(healthy ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ healthy, ...state }, null, 1));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }).listen(PORT, () => console.log(`[health] listening on :${PORT} (/live, /health)`));

  let attempt = 0;
  for (;;) {
    try {
      const reason = await runOnce(supabase);
      console.log(`[stream] ended (${reason})`);
      state.lastError = null;
      attempt = reason === "closed" ? 0 : attempt + 1;
    } catch (e) {
      const err = e as Error;
      state.lastError = err.message;
      // 401 means the guest JWT lapsed — reconnecting mints a fresh one, so
      // retry promptly. 403 is a subscription problem and won't fix itself.
      if (e instanceof SseHttpError && e.status === 403) {
        console.error("[stream] 403 — subscription/bundle problem, backing off hard:", err.message);
        attempt = BACKOFF_MS.length - 1;
      } else {
        console.error("[stream] error:", err.message);
        attempt += 1;
      }
    }

    state.reconnects += 1;
    const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    await new Promise((r) => setTimeout(r, wait));
  }
}

// Settlement heartbeat. Settling needs the escrow key, which lives only on
// Vercel — so this always-on process just pings the app's settle route once
// a minute (rooms go live at kickoff, resolve early behind the safety window,
// winners get paid). Optional: without SETTLE_URL + CRON_SECRET it's off, and
// rooms still settle when they're viewed. The route is idempotent, so an
// overlapping ping can't pay anyone twice.
const SETTLE_URL = process.env.SETTLE_URL;
const CRON_SECRET = process.env.CRON_SECRET;
if (SETTLE_URL && CRON_SECRET) {
  const settleTick = async () => {
    try {
      const res = await fetch(SETTLE_URL, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
      if (!res.ok) console.error(`[settle] ${res.status}`);
    } catch (e) {
      console.error("[settle] ping failed:", (e as Error).message);
    }
  };
  setInterval(settleTick, 60_000);
  console.log("[settle] heartbeat on — every 60s");
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`[worker] ${signal} — exiting`);
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});
