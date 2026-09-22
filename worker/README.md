# TxLINE scores worker

Always-on consumer of TxLINE's Server-Sent Events scores stream. Writes live
match state and events into Supabase, which fans them out to clients over
Realtime.

Separate from the Next app because a persistent SSE connection cannot live in
a Vercel function — functions are request-scoped and duration-capped, at any
plan tier. That's an architecture mismatch, not a limit you can pay past.

## Why it's a web service, not a worker

Render's free tier has **no background workers**, only web services, and
sleeps idle ones after ~15 minutes. So this runs an HTTP server, kept awake by
an external pinger (UptimeRobot, cron-job.org).

Two routes, and the distinction matters:

- **`/live`** — 200 whenever the process is up. This is what the *platform*
  health check must use. Pointing Render at `/health` instead would make it
  restart the worker during any normal reconnect, turning a flapping stream
  into a restart loop.
- **`/health`** — reports real stream state and returns **503 when
  disconnected**. Point your uptime monitor here, so it alerts on a broken
  stream rather than merely keeping the instance awake.

Free tier gives 750 instance-hours against a ~730-hour month, so exactly one
always-on service fits. Don't plan a second.

## Reliability

The stream has **no `Last-Event-ID`**, so a reconnect cannot resume. Every
connect and reconnect therefore backfills from `/scores/snapshot` for all
active fixtures before trusting the stream again. This isn't belt-and-braces:
free instances get recycled, and the gap lands exactly when it hurts —
mid-match.

Three layers cover the same ground deliberately:

1. this worker — liveness
2. its snapshot backfill — repairs each reconnect gap
3. `/api/cron/sync-scores` in the app — a periodic backstop independent of
   whether the worker is even running

TxLINE heartbeats while idle, so silence for 90s is treated as a dead socket
and forces a reconnect. A `403` means a subscription or bundle problem that
won't fix itself, so it backs off hard rather than hammering.

## Shared code

The sport-branching normaliser and the DB write logic live in
`../src/lib/txline/` and are compiled into this worker via `tsconfig.json`'s
`include`. That's the reason this lives in the same repo: exactly one copy of
the logic that decides what a goal is and how a match row gets written.

Note this package is deliberately **not** `type: module`. Those shared files
resolve against the repo root's CommonJS `package.json`, so under `NodeNext`
they would emit CJS while worker files emitted ESM — and the mix breaks named
imports. Everything is CommonJS instead.

## Environment

```
TXLINE_API_TOKEN            required — app-level token from the on-chain subscription
NEXT_PUBLIC_SUPABASE_URL    required
SUPABASE_SERVICE_ROLE_KEY   required — matches/match_events have no client write policies
TXLINE_BASE_URL             optional — defaults to the devnet host
PORT                        provided by Render; defaults to 8080
```

## Running

```bash
npm install
npm run build
npm start
```

Locally, `node --env-file=../.env.local dist/worker/src/index.js` reuses the
app's env file.

## Deploying to Render

- Root directory: `worker`
- Build: `npm install && npm run build`
- Start: `npm start`
- Add a `/health` ping every ~10 minutes to prevent sleep
