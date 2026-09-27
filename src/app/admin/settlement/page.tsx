import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { db, rpc } from "@/lib/admin/data";
import { DataTable, Kpi, KpiGrid, PageHeader, Section, StatePill, Tabs, num, usd, when, type Column } from "@/components/admin/ui";
import { LiveStream } from "@/components/admin/live-stream";
import { eventContext, loadEvents } from "@/lib/admin/data";
import { describeEvent } from "@/lib/admin/events";

// Settlement, operationally: what's waiting and why, what's done, what
// failed, and — in plain words — how every result is verified before money
// moves ("Trust must be visible").

const TABS = [
  { id: "queue", label: "Queue" },
  { id: "history", label: "History" },
  { id: "failed", label: "Failed & stuck" },
  { id: "trustflow", label: "How results are verified" },
];

interface Room {
  id: string;
  state: string;
  prediction: string;
  home_team: string | null;
  away_team: string | null;
  kickoff_at: string | null;
  match_status: string | null;
  provider: string | null;
  participants: number;
  pool_cents: number;
  resolved_outcome: string | null;
  pending_outcome: string | null;
  settled_at: string | null;
}

function waitingFor(r: Room): string {
  switch (r.state) {
    case "open":
      return "Taking stakes until kickoff";
    case "live":
      return "Match in play — watching for a deciding moment";
    case "awaiting_result":
      return r.provider === "bigballs" ? "Full time seen — confirming it holds for 5 minutes" : "Match finished — waiting for the final whistle record";
    case "verifying":
      return `Decided early (${r.pending_outcome?.toUpperCase()}) — 10-minute safety window, restarts on any correction`;
    case "settling":
      return `Result ${r.resolved_outcome?.toUpperCase()} — payouts being sent and confirmed on Solana`;
    case "stuck":
      return "No result a day after kickoff — check the match's data, or void & refund";
    default:
      return "—";
  }
}

export default async function SettlementPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab = "queue" } = await searchParams;

  return (
    <div>
      <PageHeader title="Settlement" subtitle="Every room from kickoff to paid — and why it's waiting if it is." />
      <Tabs tabs={TABS} active={tab} base="/admin/settlement" />
      {tab === "queue" && <Queue />}
      {tab === "history" && <History />}
      {tab === "failed" && <Failed />}
      {tab === "trustflow" && <TrustFlow />}
    </div>
  );
}

const roomCols = (extra: Column<Room>[]): Column<Room>[] => [
  { label: "Room", cell: (r) => <span className="font-medium">{r.prediction}</span> },
  { label: "State", cell: (r) => <StatePill state={r.state} /> },
  { label: "Match", cell: (r) => <span className="text-muted">{r.home_team ? `${r.home_team} v ${r.away_team}` : "—"}</span> },
  { label: "Kickoff", cell: (r) => <span className="text-muted">{when(r.kickoff_at)}</span> },
  { label: "Pot", cell: (r) => usd(r.pool_cents), align: "right" },
  { label: "People", cell: (r) => num(r.participants), align: "right" },
  ...extra,
];

async function Queue() {
  const [live, pending] = await Promise.all([rpc<Room[]>("admin_rooms", { p_state: "live", p_limit: 200 }), rpc<Room[]>("admin_rooms", { p_state: "pending", p_limit: 200 })]);
  const rows = [...pending, ...live];
  return (
    <>
      <KpiGrid>
        <Kpi label="Live" value={num(live.length)} tone={live.length ? "good" : "neutral"} />
        <Kpi label="Awaiting result" value={num(pending.filter((r) => r.state === "awaiting_result").length)} tone="warn" />
        <Kpi label="In safety window" value={num(pending.filter((r) => r.state === "verifying").length)} tone="warn" />
        <Kpi label="Paying out" value={num(pending.filter((r) => r.state === "settling").length)} tone="warn" />
        <Kpi label="Stuck" value={num(pending.filter((r) => r.state === "stuck").length)} tone={pending.some((r) => r.state === "stuck") ? "bad" : "good"} />
        <Kpi label="Money waiting" value={usd(rows.reduce((s, r) => s + Number(r.pool_cents), 0))} />
      </KpiGrid>
      <div className="mt-6">
        <DataTable
          columns={roomCols([{ label: "Waiting for", cell: (r) => <span className="text-[12px] text-muted">{waitingFor(r)}</span> }, { label: "Data", cell: (r) => <span className="text-[12px] text-muted">{r.provider}</span> }])}
          rows={rows}
          rowHref={(r) => `/admin/rooms/${r.id}`}
          empty="Nothing in the queue. Rooms appear here from kickoff until they're paid."
        />
      </div>
    </>
  );
}

async function History() {
  const [settled, refunded, { data: timings }] = await Promise.all([
    rpc<Room[]>("admin_rooms", { p_state: "settled", p_limit: 200 }),
    rpc<Room[]>("admin_rooms", { p_state: "refunded", p_limit: 200 }),
    db().from("rooms").select("resolved_at, settled_at").not("settled_at", "is", null).not("resolved_at", "is", null).limit(500),
  ]);
  const secs = ((timings ?? []) as { resolved_at: string; settled_at: string }[]).map((t) => (+new Date(t.settled_at) - +new Date(t.resolved_at)) / 1000).filter((s) => s >= 0).sort((a, b) => a - b);
  const median = secs.length ? secs[Math.floor(secs.length / 2)] : null;
  const rows = [...settled, ...refunded].sort((a, b) => +new Date(b.settled_at ?? 0) - +new Date(a.settled_at ?? 0));
  return (
    <>
      <KpiGrid>
        <Kpi label="Settled" value={num(settled.length)} tone="good" />
        <Kpi label="Refunded" value={num(refunded.length)} />
        <Kpi label="Median result → paid" value={median === null ? "—" : median < 120 ? `${Math.round(median)}s` : `${Math.round(median / 60)} min`} sub="from the result being claimed to the room closing" />
        <Kpi label="Paid through" value={usd(settled.reduce((s, r) => s + Number(r.pool_cents), 0))} />
      </KpiGrid>
      <div className="mt-6">
        <DataTable columns={roomCols([{ label: "Result", cell: (r) => r.resolved_outcome?.toUpperCase() ?? "—" }, { label: "Closed", cell: (r) => <span className="text-muted">{when(r.settled_at)}</span> }])} rows={rows} rowHref={(r) => `/admin/rooms/${r.id}`} empty="No rooms have settled yet." />
      </div>
    </>
  );
}

async function Failed() {
  const [stuck, events] = await Promise.all([rpc<Room[]>("admin_rooms", { p_state: "stuck", p_limit: 200 }), loadEvents({ types: ["SETTLEMENT_FAILED", "CLAIM_FAILED"], limit: 100 })]);
  const ctx = await eventContext(events);
  return (
    <>
      <Section title="Stuck rooms" hint="No result a day after kickoff. Open one to see its match data, then re-run settlement or void & refund.">
        <DataTable columns={roomCols([{ label: "Data", cell: (r) => <span className="text-[12px] text-muted">{r.provider}</span> }])} rows={stuck} rowHref={(r) => `/admin/rooms/${r.id}`} empty="No stuck rooms." />
      </Section>
      <Section title="Settlement & claim failures">
        <LiveStream initial={events.map((e) => ({ id: e.id, at: e.at, type: e.type, status: e.status, ...describeEvent(e, ctx) }))} limit={100} />
      </Section>
    </>
  );
}

function TrustFlow() {
  const steps: [string, string][] = [
    ["1 · Stakes lock at kickoff", "Every stake is a Solana transfer into escrow, recorded with its signature. At kickoff the room goes live and takes no more stakes."],
    ["2 · The match is scored", "Premier League and NFL: TxLINE streams every event, backfilled from snapshots after any reconnect. UCL, La Liga, Bundesliga, Serie A, Ligue 1, MLS: Big Balls, polled only while a match with money on it is live."],
    ["3 · The room's rule reads the facts", "Each room stores the exact rule for its claim (e.g. total goals over 2.5). The same resolver decides every room — the admin screens call it too, never a copy."],
    ["4 · Early results wait", "A claim decided before full time (the 3rd goal of an Over 2.5) is held for a 10-minute safety window. Any correction — VAR, a goal taken back — restarts it."],
    ["5 · Full time is confirmed", "TxLINE: the final-whistle record. Big Balls: the same finished score must hold for 5 minutes before it counts (it's the only source for those leagues)."],
    ["6 · Payouts are idempotent", "Winners are paid pro rata from escrow; each batch's signature is written before it's sent, so a crash or retry can never pay twice. Fees (3% Rivaly + 2% host, of winners' profit only) stay in escrow until claimed."],
    ["7 · Everything is checkable", "Every stake, payout, claim and withdrawal links to its Solana transaction. Escrow is reconciled against what it owes on every settlement run."],
    ["8 · When data never comes", "Postponed or cancelled matches refund everyone automatically. A room still undecided a day after kickoff shows as Stuck here — an admin checks it and voids & refunds (audited)."],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {steps.map(([title, body]) => (
        <div key={title} className="rounded-xl bg-surface p-4 ring-1 ring-border">
          <p className="text-[14px] font-semibold text-foreground">{title}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
        </div>
      ))}
      <p className="text-[12px] text-muted md:col-span-2">
        Code: <span className="font-mono">src/lib/settlement/resolve.ts</span> (rules), <span className="font-mono">settle.ts</span> (payouts),{" "}
        <span className="font-mono">src/lib/bigballs/logic.ts</span> (confirmation). <Link href="/admin/rooms?state=stuck" className="underline">See stuck rooms</Link>
      </p>
    </div>
  );
}
