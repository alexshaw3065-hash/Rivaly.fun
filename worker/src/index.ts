import { createServer } from "node:http";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyScores } from "../../src/lib/txline/apply-scores";
import type { TxLineScores } from "../../src/lib/txline/types";
import { consumeSse, SseHttpError } from "./sse";
import { pollLive, syncFixtures } from "../../src/lib/bigballs/sync";
import { usedToday } from "../../src/lib/bigballs/client";

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
  bigballs: {
    on: false,
    callsToday: 0,
    lastPollAt: null as string | null,
    lastPoll: null as unknown,
    nextPollInS: null as number | null,
    lastFixturesAt: null as string | null,
    lastFixtures: null as unknown,
    lastError: null as string | null,
  },
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
    .eq("provider", "txline")
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
// Vercel — so this always-on process just pings the app's settle route (each
// minute while there's work — see settleHasWork) (rooms go live at kickoff, resolve early behind the safety window,
// winners get paid). Optional: without SETTLE_URL + CRON_SECRET it's off, and
// rooms still settle when they're viewed. The route is idempotent, so an
// overlapping ping can't pay anyone twice.
const SETTLE_URL = process.env.SETTLE_URL;
const CRON_SECRET = process.env.CRON_SECRET;
// Every settle run is a Vercel function (and a few Solana reads), so the
// minute tick only calls it when something could need it; otherwise a slow
// safety heartbeat covers recovery and the escrow check. Rooms also settle
// whenever they're viewed, so nothing waits on this.
const SAFETY_HEARTBEAT_MS = 15 * 60_000;

/** Is there anything for a settlement pass to do right now? Cheap counts only. */
async function settleHasWork(): Promise<boolean> {
  const supabase = db();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const count = (q: PromiseLike<{ count: number | null; error: unknown }>) =>
    Promise.resolve(q).then((r) => (r.error ? 1 : (r.count ?? 0)), () => 1); // unsure → do the work
  // Rooms about to go live, live, or resolving: matches kicking off from 6 h
  // ago to 2 min ahead (rooms.match_id is text, so two steps, not a join).
  const { data: near, error: nearError } = await supabase
    .from("matches")
    .select("id")
    .gte("kickoff_at", iso(now - 6 * 60 * 60_000))
    .lte("kickoff_at", iso(now + 2 * 60_000))
    .limit(150);
  // A huge matchday (or an error) just means: run the pass.
  if (nearError || (near?.length ?? 0) >= 150) return true;
  const nearIds = (near ?? []).map((m) => String(m.id));
  const checks = await Promise.all([
    nearIds.length === 0
      ? 0
      : count(supabase.from("rooms").select("id", { count: "exact", head: true }).in("status", ["open", "live"]).in("match_id", nearIds)),
    // Stakes, fee claims and welcome credits still landing on chain.
    count(supabase.from("stake_intents").select("id", { count: "exact", head: true }).eq("status", "submitted")),
    count(supabase.from("fee_claims").select("id", { count: "exact", head: true }).in("status", ["pending", "sent"])),
    count(supabase.from("signup_grants").select("user_id", { count: "exact", head: true }).in("status", ["pending", "sent"])),
    // New accounts who may be owed their welcome credit.
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", iso(now - 30 * 60_000))),
  ]);
  return checks.some((n) => n > 0);
}

if (SETTLE_URL && CRON_SECRET) {
  let lastSettleAt = 0;
  const settleTick = async () => {
    try {
      const due = Date.now() - lastSettleAt >= SAFETY_HEARTBEAT_MS || (await settleHasWork());
      if (!due) return;
      lastSettleAt = Date.now();
      const res = await fetch(SETTLE_URL, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
      if (!res.ok) console.error(`[settle] ${res.status}`);
    } catch (e) {
      console.error("[settle] ping failed:", (e as Error).message);
    }
  };
  setInterval(settleTick, 60_000);
  console.log("[settle] heartbeat on — every 60s when there's work, every 15 min otherwise");

  // Chat photos older than 60 days: removed once a day, same app, same secret.
  const EXPIRE_URL = new URL("/api/cron/expire-photos", SETTLE_URL).toString();
  const expireTick = async () => {
    try {
      const res = await fetch(EXPIRE_URL, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
      if (!res.ok) console.error(`[expire-photos] ${res.status}`);
    } catch (e) {
      console.error("[expire-photos] ping failed:", (e as Error).message);
    }
  };
  setTimeout(expireTick, 5 * 60_000);
  setInterval(expireTick, 24 * 60 * 60_000);

  // Real team/league badges for new teams: hourly, same app, same secret.
  const CRESTS_URL = new URL("/api/cron/sync-crests", SETTLE_URL).toString();
  const crestsTick = async () => {
    try {
      const res = await fetch(CRESTS_URL, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
      if (!res.ok) console.error(`[sync-crests] ${res.status}`);
    } catch (e) {
      console.error("[sync-crests] ping failed:", (e as Error).message);
    }
  };
  setTimeout(crestsTick, 2 * 60_000);
  setInterval(crestsTick, 60 * 60_000);
}

// Big Balls: UCL, La Liga, Bundesliga, Serie A, Ligue 1, MLS. Fixtures every
// 6 hours (one call per league); live scores only for matches with a room,
// paced by the daily-budget governor in src/lib/bigballs/logic.ts. Off
// without BIGBALLS_API_KEY. Plan: docs/plans/match-data-providers.md.
const BIGBALLS_API_KEY = process.env.BIGBALLS_API_KEY?.trim();
if (BIGBALLS_API_KEY) {
  const supabase = db();
  const bb = state.bigballs;
  bb.on = true;

  // Job runs for /admin → System → Jobs (best-effort).
  const recordRun = (job: string, started: number, ok: boolean, detail: unknown) =>
    supabase
      .from("job_runs")
      .insert({ job, started_at: new Date(started).toISOString(), finished_at: new Date().toISOString(), ok, detail: { ...(detail as object), ms: Date.now() - started } })
      .then(() => undefined, () => undefined);

  const fixturesTick = async () => {
    const started = Date.now();
    try {
      bb.lastFixtures = await syncFixtures(supabase, BIGBALLS_API_KEY);
      bb.lastFixturesAt = new Date().toISOString();
      await recordRun("bigballs-fixtures", started, true, bb.lastFixtures);
    } catch (e) {
      bb.lastError = `fixtures: ${(e as Error).message}`;
      console.error("[bigballs] fixtures:", (e as Error).message);
      await recordRun("bigballs-fixtures", started, false, { error: (e as Error).message });
    }
    bb.callsToday = usedToday();
  };
  setTimeout(fixturesTick, 60_000);
  setInterval(fixturesTick, 6 * 60 * 60_000);

  const liveTick = async () => {
    let delay = 60_000;
    const started = Date.now();
    try {
      const r = await pollLive(supabase, BIGBALLS_API_KEY);
      delay = r.delayMs;
      bb.lastPoll = r;
      bb.lastPollAt = new Date().toISOString();
      if (r.errors.length) bb.lastError = r.errors.join("; ");
      // Only polls that did something (idle checks every few minutes would drown the log).
      if (r.calls > 0 || r.errors.length > 0) await recordRun("bigballs-live", started, r.errors.length === 0, r);
    } catch (e) {
      bb.lastError = `live: ${(e as Error).message}`;
      console.error("[bigballs] live:", (e as Error).message);
      await recordRun("bigballs-live", started, false, { error: (e as Error).message });
    }
    bb.callsToday = usedToday();
    bb.nextPollInS = Math.round(delay / 1000);
    setTimeout(liveTick, delay);
  };
  setTimeout(liveTick, 30_000);
  console.log("[bigballs] on — fixtures every 6h, live polling for matches with rooms");
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
