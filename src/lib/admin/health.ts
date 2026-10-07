import { db } from "./data";
import { currentBlockHeight, escrowAddress, escrowConfigured, escrowSigner, escrowUsdcCents } from "@/lib/escrow/escrow";
import { readChainRoom } from "@/lib/escrow/program";

/** Below this the escrow can't keep paying fees and room rent (program rooms front ~0.006 SOL each). */
const ESCROW_MIN_SOL = 0.5;

// Live health checks for /admin → System. Each check is timed and never
// throws — a broken dependency shows as a red row, not a broken page.

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
  ms: number | null;
}

async function timed(name: string, run: () => Promise<string>): Promise<Check> {
  const t = Date.now();
  try {
    const detail = await Promise.race([run(), new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timed out after 8s")), 8000))]);
    return { name, ok: true, detail, ms: Date.now() - t };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e), ms: Date.now() - t };
  }
}

const WORKER_HEALTH_URL = process.env.WORKER_HEALTH_URL ?? "https://rivaly-txline-worker.onrender.com/health";

export interface WorkerHealth {
  healthy: boolean;
  connected: boolean;
  startedAt: string;
  lastEventAt: string | null;
  messages: number;
  applied: number;
  reconnects: number;
  lastError: string | null;
  bigballs?: {
    on: boolean;
    callsToday: number;
    lastPollAt: string | null;
    nextPollInS: number | null;
    lastFixturesAt: string | null;
    lastFixtures: { leagues: number; fetched: number; errors: string[] } | null;
    lastPoll: { polled: number; calls: number; goals: number; confirmedFinals: number; errors: string[] } | null;
    lastError: string | null;
  };
}

export async function workerHealth(): Promise<WorkerHealth | null> {
  try {
    const res = await fetch(WORKER_HEALTH_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return (await res.json()) as WorkerHealth;
  } catch {
    return null;
  }
}

/** What escrow holds against what it owes (open stakes + fees not yet paid out). */
export async function escrowPosition(): Promise<{ balance: number; stakes: number; fees: number; ok: boolean } | null> {
  if (!escrowConfigured()) return null;
  const admin = db();
  const [{ data: owed }, { data: feeRows }, balance] = await Promise.all([
    // Program rooms' stakes sit in their own vaults, not here (see programVaults).
    admin.from("entries").select("amount_cents, room:rooms!inner(status, custody)").in("room.status", ["open", "live"]).eq("room.custody", "wallet").not("stake_tx_signature", "is", null),
    admin.from("room_fees").select("cents, claim:fee_claims(status)"),
    escrowUsdcCents(),
  ]);
  const stakes = ((owed ?? []) as { amount_cents: number }[]).reduce((s, e) => s + Number(e.amount_cents), 0);
  const fees = ((feeRows ?? []) as unknown as { cents: number; claim: { status: string } | null }[])
    .filter((f) => f.claim?.status !== "confirmed")
    .reduce((s, f) => s + Number(f.cents), 0);
  return { balance, stakes, fees, ok: balance >= stakes + fees };
}

/** Open program rooms: does each vault hold what the database says was staked? */
export async function programVaults(): Promise<{ rooms: number; mismatched: string[] }> {
  const admin = db();
  const { data } = await admin
    .from("rooms")
    .select("id, entries(amount_cents, side, stake_tx_signature)")
    .eq("custody", "program")
    .in("status", ["open", "live"])
    .limit(50);
  const rows = (data ?? []) as { id: string; entries: { amount_cents: number; side: string; stake_tx_signature: string | null }[] }[];
  const mismatched: string[] = [];
  for (const r of rows) {
    const staked = r.entries.filter((e) => e.stake_tx_signature);
    const yes = staked.filter((e) => e.side === "yes").reduce((s, e) => s + Number(e.amount_cents), 0);
    const no = staked.filter((e) => e.side === "no").reduce((s, e) => s + Number(e.amount_cents), 0);
    const chain = await readChainRoom(r.id).catch(() => null);
    // Resolved on-chain but not yet closed is fine (settlement is mid-way).
    if (!chain || (chain.outcome === "open" && (chain.yesCents !== yes || chain.noCents !== no))) mismatched.push(r.id);
  }
  return { rooms: rows.length, mismatched };
}

export async function runChecks(): Promise<{ checks: Check[]; worker: WorkerHealth | null }> {
  const worker = await workerHealth();
  const checks = await Promise.all([
    timed("Database (Supabase)", async () => {
      const { count, error } = await db().from("profiles").select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return `${count} profiles readable`;
    }),
    timed("Solana RPC", async () => `block height ${(await currentBlockHeight()).toLocaleString("en-US")}`),
    timed("Escrow wallet", async () => {
      if (!escrowConfigured()) throw new Error("ESCROW_SECRET_KEY / NEXT_PUBLIC_ESCROW_ADDRESS not set here");
      const p = await escrowPosition();
      if (!p) throw new Error("not configured");
      const detail = `${escrowAddress().slice(0, 4)}…${escrowAddress().slice(-4)} holds $${(p.balance / 100).toFixed(2)}; owes $${((p.stakes + p.fees) / 100).toFixed(2)}`;
      if (!p.ok) throw new Error(`SHORT — ${detail}`);
      return detail;
    }),
    timed("Escrow SOL (fees and room rent)", async () => {
      if (!escrowConfigured()) throw new Error("not configured");
      const { keypair, connection } = escrowSigner();
      const sol = (await connection.getBalance(keypair.publicKey, "confirmed")) / 1e9;
      const detail = `${sol.toFixed(3)} SOL`;
      if (sol < ESCROW_MIN_SOL) throw new Error(`LOW — ${detail}; stakes stop when it runs out`);
      return detail;
    }),
    timed("On-chain room vaults", async () => {
      const v = await programVaults();
      if (v.mismatched.length) throw new Error(`${v.mismatched.length} of ${v.rooms} open program rooms don't match the database: ${v.mismatched.slice(0, 3).join(", ")}`);
      return v.rooms ? `${v.rooms} open program room${v.rooms === 1 ? "" : "s"}, every vault matches` : "no open program rooms";
    }),
    timed("Render worker", async () => {
      if (!worker) throw new Error(`no answer from ${WORKER_HEALTH_URL}`);
      return `up since ${new Date(worker.startedAt).toLocaleString("en-GB")}, ${worker.reconnects} reconnects`;
    }),
    timed("TxLINE stream (Premier League, NFL)", async () => {
      if (!worker) throw new Error("worker unreachable");
      if (!worker.connected) throw new Error(`disconnected${worker.lastError ? `: ${worker.lastError}` : ""}`);
      return `connected · last event ${worker.lastEventAt ? new Date(worker.lastEventAt).toLocaleString("en-GB") : "none yet"} · ${worker.applied.toLocaleString("en-US")} applied`;
    }),
    timed("Big Balls (UCL, top 5, MLS)", async () => {
      const bb = worker?.bigballs;
      if (!bb?.on) throw new Error("not running (BIGBALLS_API_KEY missing on the worker?)");
      if (bb.lastError) throw new Error(`${bb.callsToday}/500 calls today · last error: ${bb.lastError}`);
      return `${bb.callsToday}/500 calls today · fixtures ${bb.lastFixturesAt ? new Date(bb.lastFixturesAt).toLocaleString("en-GB") : "not yet"} · next poll in ${bb.nextPollInS ?? "?"}s`;
    }),
    timed("Settlement cron", async () => {
      const { data } = await db().from("job_runs").select("started_at, ok").eq("job", "settle").order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) throw new Error("no runs recorded yet (Render must call /api/cron/settle with CRON_SECRET)");
      const ago = Math.round((Date.now() - +new Date(data.started_at)) / 60000);
      if (ago > 5) throw new Error(`last run ${ago} minutes ago`);
      if (!data.ok) throw new Error("last run failed — see Jobs");
      return `last run ${ago} min ago`;
    }),
    timed("Config", async () => {
      const missing = ["CRON_SECRET", "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "NEXT_PUBLIC_KLIPY_API_KEY"].filter((k) => !process.env[k]);
      if (missing.length) throw new Error(`missing: ${missing.join(", ")}`);
      return "all expected keys present";
    }),
  ]);
  return { checks, worker };
}
