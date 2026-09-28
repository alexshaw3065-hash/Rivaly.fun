import Link from "next/link";
import { atLeast, requireAdmin } from "@/lib/admin/guard";
import { db, displayName, eventContext, loadEvents, rpc } from "@/lib/admin/data";
import { describeEvent } from "@/lib/admin/events";
import { escrowPosition } from "@/lib/admin/health";
import { explorerTxUrl } from "@/lib/wallet/constants";
import { Bars, DataTable, Kpi, KpiGrid, PageHeader, Section, StatePill, Tabs, num, usd, when, type Column } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/admin-forms";
import { withdrawRivalyFees } from "@/app/admin/actions";

// The money: what escrow holds against what it owes, every transaction with
// its on-chain receipt, stakes, payouts, fees and revenue, and anything that
// failed. Rivaly never bets against its users — the only revenue is the fee
// on winners' profit, and it's all here.

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "stakes", label: "Stakes & pools" },
  { id: "payouts", label: "Payouts" },
  { id: "fees", label: "Fees & revenue" },
  { id: "failed", label: "Failed" },
];

const MONEY_TYPES = ["STAKE_PLACED", "PAYOUT_SENT", "REFUND_SENT", "DEPOSIT", "WITHDRAWAL", "CLAIM_COMPLETED", "FEE_EARNED", "STAKE_FAILED", "CLAIM_FAILED"];
type Overview = Record<string, number>;
type Day = { day: string; volume_cents: number; fees_cents: number; payouts_cents: number };
const short = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireAdmin();
  const { tab = "overview" } = await searchParams;
  const admin = db();

  return (
    <div>
      <PageHeader title="Finance" subtitle="Escrow, stakes, payouts and fees — every figure traceable to a Solana transaction." />
      <Tabs tabs={TABS} active={tab} base="/admin/finance" />
      {tab === "overview" && <OverviewTab canWithdraw={atLeast(me.role, "owner")} />}
      {tab === "transactions" && <Ledger types={MONEY_TYPES} />}
      {tab === "stakes" && <StakesTab admin={admin} />}
      {tab === "payouts" && <PayoutsTab admin={admin} />}
      {tab === "fees" && <FeesTab admin={admin} />}
      {tab === "failed" && <FailedTab admin={admin} />}
    </div>
  );
}

async function OverviewTab({ canWithdraw }: { canWithdraw: boolean }) {
  const admin = db();
  const [o, days, position, { data: settings }, { data: rivalyFees }, { data: openClaims }] = await Promise.all([
    rpc<Overview>("admin_overview"),
    rpc<Day[]>("admin_daily", { p_days: 30 }),
    escrowPosition().catch(() => null),
    admin.from("platform_settings").select("fees_enabled, rivaly_fee_bps, host_fee_bps, fee_wallet").eq("id", true).maybeSingle(),
    admin.from("room_fees").select("cents, claim:fee_claims(status)").eq("kind", "rivaly"),
    admin.from("room_fees").select("cents, claim:fee_claims(status)").eq("kind", "host"),
  ]);
  const unpaid = (rows: unknown) =>
    ((rows ?? []) as { cents: number; claim: { status: string } | null }[]).filter((f) => f.claim?.status !== "confirmed").reduce((s, f) => s + Number(f.cents), 0);
  const rivalyAvailable = ((rivalyFees ?? []) as unknown as { cents: number; claim: { status: string } | null }[])
    .filter((f) => !f.claim || f.claim.status === "failed")
    .reduce((s, f) => s + Number(f.cents), 0);

  return (
    <>
      <Section title="Escrow" hint="Escrow must always hold at least what it owes. Checked every minute by settlement too.">
        <KpiGrid>
          <Kpi label="Escrow holds" value={position ? usd(position.balance) : "—"} tone={position ? (position.ok ? "good" : "bad") : "neutral"} sub={position ? (position.ok ? "covers everything owed" : "SHORT — investigate now") : "not configured here"} />
          <Kpi label="Owed: open stakes" value={position ? usd(position.stakes) : "—"} />
          <Kpi label="Owed: unpaid fees" value={position ? usd(position.fees) : "—"} sub="host claimable + Rivaly accrued" />
          <Kpi label="Headroom" value={position ? usd(position.balance - position.stakes - position.fees) : "—"} />
          <Kpi label="Volume staked" value={usd(o.volume_total, { compact: true })} sub={`${num(o.predictions_total)} stakes`} />
          <Kpi label="Paid · refunded" value={usd(o.payout_volume, { compact: true })} sub={`${usd(o.refund_volume)} refunded`} />
        </KpiGrid>
      </Section>
      <Section title="Revenue">
        <KpiGrid>
          <Kpi label="Fees" value={settings?.fees_enabled ? "On" : "Off"} tone={settings?.fees_enabled ? "good" : "neutral"} sub={`${(settings?.rivaly_fee_bps ?? 0) / 100}% Rivaly + ${(settings?.host_fee_bps ?? 0) / 100}% host`} href="/admin/settings" />
          <Kpi label="Rivaly fees earned" value={usd(o.fees_rivaly)} />
          <Kpi label="Rivaly: ready to withdraw" value={usd(rivalyAvailable)} tone={rivalyAvailable ? "good" : "neutral"} />
          <Kpi label="Host fees earned" value={usd(o.fees_host)} />
          <Kpi label="Hosts: not yet claimed" value={usd(unpaid(openClaims))} />
          <Kpi label="Fee wallet" value={<span className="break-all text-caption">{settings?.fee_wallet ?? "not set"}</span>} />
        </KpiGrid>
        {canWithdraw && (
          <div className="mt-4 max-w-md">
            <ActionButton
              label={`Withdraw ${usd(rivalyAvailable)} to the fee wallet`}
              confirmWord="WITHDRAW"
              action={withdrawRivalyFees}
              help="Sends every unwithdrawn Rivaly fee from escrow to the fee wallet in one transfer. Recorded before it's signed; if it fails, it goes back to available."
            />
          </div>
        )}
      </Section>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 text-caption text-secondary">Volume staked · 30 days</p>
          <Bars data={days.map((d) => ({ label: short(d.day), value: d.volume_cents }))} format={(v) => usd(v)} />
        </div>
        <div>
          <p className="mb-2 text-caption text-secondary">Paid to winners · 30 days</p>
          <Bars data={days.map((d) => ({ label: short(d.day), value: d.payouts_cents }))} format={(v) => usd(v)} />
        </div>
        <div>
          <p className="mb-2 text-caption text-secondary">Fees · 30 days</p>
          <Bars data={days.map((d) => ({ label: short(d.day), value: d.fees_cents }))} format={(v) => usd(v)} />
        </div>
      </div>
    </>
  );
}

async function Ledger({ types, status }: { types: string[]; status?: "failed" }) {
  const events = await loadEvents({ types, limit: 200, status });
  const ctx = await eventContext(events);
  const rows = events.map((e) => ({ e, l: describeEvent(e, ctx) }));
  const columns: Column<(typeof rows)[number]>[] = [
    { label: "When", cell: (r) => <span className="font-mono text-caption text-secondary">{when(r.e.at, "full")}</span> },
    { label: "What", cell: (r) => (r.l.href ? <Link href={r.l.href} className="hover:underline">{r.l.text}</Link> : r.l.text) },
    { label: "Type", cell: (r) => <span className="font-mono text-caption text-secondary">{r.e.type}</span> },
    { label: "Amount", cell: (r) => (r.e.amount_cents != null ? usd(r.e.amount_cents) : "—"), align: "right" },
    { label: "Status", cell: (r) => <StatePill state={r.e.status} /> },
    { label: "Receipt", cell: (r) => (r.e.tx_signature ? <a href={explorerTxUrl(r.e.tx_signature)} target="_blank" rel="noopener noreferrer" className="font-mono text-caption text-secondary underline">{r.e.tx_signature.slice(0, 8)}… ↗</a> : "—") },
  ];
  return <DataTable columns={columns} rows={rows} empty="No transactions yet." />;
}

type AdminDb = ReturnType<typeof db>;

async function StakesTab({ admin }: { admin: AdminDb }) {
  const { data } = await admin
    .from("entries")
    .select("id, side, amount_cents, created_at, stake_tx_signature, user_id, profile:profiles(username, display_name), room:rooms(id, prediction, status, pool_total_cents)")
    .order("created_at", { ascending: false })
    .limit(200);
  type R = { id: string; side: string; amount_cents: number; created_at: string; stake_tx_signature: string | null; user_id: string; profile: { username: string; display_name: string } | null; room: { id: string; prediction: string; status: string; pool_total_cents: number } | null };
  const columns: Column<R>[] = [
    { label: "When", cell: (r) => <span className="text-secondary">{when(r.created_at)}</span> },
    { label: "Who", cell: (r) => <Link href={`/admin/users/${r.user_id}`} className="hover:underline">{r.profile ? displayName(r.profile) : "—"}</Link> },
    { label: "Room", cell: (r) => (r.room ? <Link href={`/admin/rooms/${r.room.id}`} className="hover:underline">{r.room.prediction}</Link> : "—") },
    { label: "Side", cell: (r) => <span style={{ color: r.side === "yes" ? "var(--yes)" : "var(--no)" }}>{r.side.toUpperCase()}</span> },
    { label: "Stake", cell: (r) => usd(r.amount_cents), align: "right" },
    { label: "Pot now", cell: (r) => usd(r.room?.pool_total_cents), align: "right" },
    { label: "Room status", cell: (r) => <StatePill state={r.room?.status ?? "open"} /> },
    { label: "Receipt", cell: (r) => (r.stake_tx_signature ? <a href={explorerTxUrl(r.stake_tx_signature)} target="_blank" rel="noopener noreferrer" className="text-caption text-secondary underline">↗</a> : "—") },
  ];
  return <DataTable columns={columns} rows={(data ?? []) as unknown as R[]} empty="No stakes yet." />;
}

async function PayoutsTab({ admin }: { admin: AdminDb }) {
  const { data } = await admin
    .from("entries")
    .select("id, is_winner, payout_cents, amount_cents, payout_tx_signature, user_id, profile:profiles(username, display_name), room:rooms(id, prediction, settled_at)")
    .not("payout_cents", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  type R = { id: string; is_winner: boolean | null; payout_cents: number; amount_cents: number; payout_tx_signature: string | null; user_id: string; profile: { username: string; display_name: string } | null; room: { id: string; prediction: string; settled_at: string | null } | null };
  const columns: Column<R>[] = [
    { label: "Who", cell: (r) => <Link href={`/admin/users/${r.user_id}`} className="hover:underline">{r.profile ? displayName(r.profile) : "—"}</Link> },
    { label: "Room", cell: (r) => (r.room ? <Link href={`/admin/rooms/${r.room.id}`} className="hover:underline">{r.room.prediction}</Link> : "—") },
    { label: "Kind", cell: (r) => <StatePill state={r.is_winner ? "ok" : r.is_winner === false ? "neutral" : "pending"} label={r.is_winner ? "winnings" : r.is_winner === false ? "lost (nothing owed)" : "refund"} /> },
    { label: "Stake", cell: (r) => usd(r.amount_cents), align: "right" },
    { label: "Paid", cell: (r) => usd(r.payout_cents), align: "right" },
    { label: "Status", cell: (r) => (r.payout_cents === 0 ? <span className="text-secondary">—</span> : <StatePill state={r.payout_tx_signature ? "ok" : "pending"} label={r.payout_tx_signature ? "sent" : "owed"} />) },
    { label: "Receipt", cell: (r) => (r.payout_tx_signature ? <a href={explorerTxUrl(r.payout_tx_signature)} target="_blank" rel="noopener noreferrer" className="text-caption text-secondary underline">↗</a> : "—") },
    { label: "Settled", cell: (r) => <span className="text-secondary">{when(r.room?.settled_at)}</span> },
  ];
  return <DataTable columns={columns} rows={(data ?? []) as unknown as R[]} empty="No payouts yet." />;
}

async function FeesTab({ admin }: { admin: AdminDb }) {
  const [{ data: fees }, { data: claims }] = await Promise.all([
    admin.from("room_fees").select("room_id, kind, cents, created_at, recipient_id, room:rooms(prediction), recipient:profiles(username, display_name), claim:fee_claims(status)").order("created_at", { ascending: false }).limit(200),
    admin.from("fee_claims").select("id, kind, cents, status, wallet, payout_tx_signature, created_at, user:profiles(username, display_name)").order("created_at", { ascending: false }).limit(100),
  ]);
  type F = { room_id: string; kind: string; cents: number; created_at: string; recipient_id: string | null; room: { prediction: string } | null; recipient: { username: string; display_name: string } | null; claim: { status: string } | null };
  type C = { id: string; kind: string; cents: number; status: string; wallet: string; payout_tx_signature: string | null; created_at: string; user: { username: string; display_name: string } | null };
  const feeCols: Column<F>[] = [
    { label: "When", cell: (r) => <span className="text-secondary">{when(r.created_at)}</span> },
    { label: "Room", cell: (r) => <Link href={`/admin/rooms/${r.room_id}`} className="hover:underline">{r.room?.prediction ?? "—"}</Link> },
    { label: "To", cell: (r) => (r.kind === "rivaly" ? "Rivaly" : r.recipient ? displayName(r.recipient) : "host") },
    { label: "Amount", cell: (r) => usd(r.cents), align: "right" },
    { label: "Paid out", cell: (r) => <StatePill state={r.claim?.status === "confirmed" ? "ok" : r.claim && r.claim.status !== "failed" ? "pending" : "open"} label={r.claim?.status === "confirmed" ? "claimed" : r.claim && r.claim.status !== "failed" ? "claiming" : "in escrow"} /> },
  ];
  const claimCols: Column<C>[] = [
    { label: "When", cell: (r) => <span className="text-secondary">{when(r.created_at)}</span> },
    { label: "Kind", cell: (r) => (r.kind === "rivaly" ? "Rivaly withdrawal" : `Host claim · ${r.user ? displayName(r.user) : ""}`) },
    { label: "Amount", cell: (r) => usd(r.cents), align: "right" },
    { label: "Status", cell: (r) => <StatePill state={r.status} /> },
    { label: "To", cell: (r) => <span className="font-mono text-caption text-secondary">{r.wallet.slice(0, 4)}…{r.wallet.slice(-4)}</span> },
    { label: "Receipt", cell: (r) => (r.payout_tx_signature ? <a href={explorerTxUrl(r.payout_tx_signature)} target="_blank" rel="noopener noreferrer" className="text-caption text-secondary underline">↗</a> : "—") },
  ];
  return (
    <>
      <Section title="Fees earned, per room">
        <DataTable columns={feeCols} rows={(fees ?? []) as unknown as F[]} empty="No fees yet — they're recorded when a room with fees settles." />
      </Section>
      <Section title="Claims & withdrawals">
        <DataTable columns={claimCols} rows={(claims ?? []) as unknown as C[]} empty="No claims yet." />
      </Section>
    </>
  );
}

async function FailedTab({ admin }: { admin: AdminDb }) {
  const { data: intents } = await admin
    .from("stake_intents")
    .select("id, kind, amount_cents, error, created_at, tx_signature, user_id, room_id, profile:profiles(username, display_name)")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(100);
  type I = { id: string; kind: string; amount_cents: number; error: string | null; created_at: string; tx_signature: string | null; user_id: string; room_id: string | null; profile: { username: string; display_name: string } | null };
  const cols: Column<I>[] = [
    { label: "When", cell: (r) => <span className="text-secondary">{when(r.created_at)}</span> },
    { label: "Who", cell: (r) => <Link href={`/admin/users/${r.user_id}`} className="hover:underline">{r.profile ? displayName(r.profile) : "—"}</Link> },
    { label: "What", cell: (r) => (r.kind === "create" ? "Creating a room" : r.room_id ? <Link href={`/admin/rooms/${r.room_id}`} className="hover:underline">Joining a room</Link> : "Joining a room") },
    { label: "Amount", cell: (r) => usd(r.amount_cents), align: "right" },
    { label: "Why", cell: (r) => <span className="text-caption text-secondary">{r.error ?? "—"}</span> },
    { label: "Tx", cell: (r) => (r.tx_signature ? <a href={explorerTxUrl(r.tx_signature)} target="_blank" rel="noopener noreferrer" className="text-caption text-secondary underline">↗</a> : "never sent") },
  ];
  return (
    <>
      <Section title="Failed stakes" hint="A stake that never landed on-chain, or landed and was refunded automatically by recovery.">
        <DataTable columns={cols} rows={(intents ?? []) as unknown as I[]} empty="No failed stakes." />
      </Section>
      <Section title="Failed settlements & claims">
        <Ledger types={["SETTLEMENT_FAILED", "CLAIM_FAILED", "STAKE_FAILED"]} status="failed" />
      </Section>
    </>
  );
}
