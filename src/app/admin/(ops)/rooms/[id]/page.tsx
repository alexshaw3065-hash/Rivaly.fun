import Link from "next/link";
import { notFound } from "next/navigation";
import { atLeast, requireAdmin } from "@/lib/admin/guard";
import { db, displayName, eventContext, loadEvents, rpc } from "@/lib/admin/data";
import { describeEvent } from "@/lib/admin/events";
import { planSettlement } from "@/lib/settlement/payouts";
import { explorerTxUrl } from "@/lib/wallet/constants";
import { DataTable, Kpi, KpiGrid, Mono, PageHeader, Section, StatePill, num, usd, when, type Column } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/admin-forms";
import { rerunSettlement, voidRoom } from "@/app/admin/actions";

// One room, end to end: its economics (from the same planSettlement the
// payout run uses — no second copy of the maths here), who's in it, every
// transaction, how its result was verified, where settlement is, and every
// admin action taken on it.

interface Entry {
  id: string;
  user_id: string;
  side: "yes" | "no";
  amount_cents: number;
  created_at: string;
  is_winner: boolean | null;
  payout_cents: number | null;
  stake_tx_signature: string | null;
  payout_tx_signature: string | null;
  profile: { username: string; display_name: string } | null;
}

const SETTLEMENT_ACTIONS = ["kickoff", "goal", "halftime_finalised", "game_finalised", "penalty", "var", "var_end", "action_discarded", "action_amend", "touchdown", "field_goal"];

export default async function RoomDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const admin = db();
  const [{ data: room }, stateRows] = await Promise.all([
    admin.from("rooms").select("*").eq("id", id).maybeSingle(),
    rpc<{ state: string }[]>("admin_rooms", { p_search: id, p_limit: 1 }),
  ]);
  if (!room) notFound();
  const state = stateRows[0]?.state ?? room.status;

  const [{ data: match }, { data: creator }, { data: entryRows }, chat, { data: lastMsg }, { data: fees }, { data: matchEvents }, { data: audit }, events] = await Promise.all([
    admin.from("matches").select("*").eq("id", room.match_id).maybeSingle(),
    admin.from("profiles").select("id, username, display_name").eq("id", room.creator_id).maybeSingle(),
    admin
      .from("entries")
      .select("id, user_id, side, amount_cents, created_at, is_winner, payout_cents, stake_tx_signature, payout_tx_signature, profile:profiles(username, display_name)")
      .eq("room_id", id)
      .order("created_at"),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("room_id", id),
    admin.from("messages").select("created_at").eq("room_id", id).order("created_at", { ascending: false }).limit(1),
    admin.from("room_fees").select("kind, cents, created_at, claim:fee_claims(status, payout_tx_signature)").eq("room_id", id),
    admin.from("match_events").select("action, minute, payload, occurred_at").eq("match_id", room.match_id).in("action", SETTLEMENT_ACTIONS).order("occurred_at").limit(200),
    admin.from("admin_audit").select("id, at, action, reason, admin:profiles!admin_audit_admin_id_fkey(username)").eq("target_type", "room").eq("target_id", id).order("at", { ascending: false }),
    loadEvents({ roomId: id, limit: 100 }),
  ]);
  const entries = (entryRows ?? []) as unknown as Entry[];
  const ctx = await eventContext(events);

  // Economics — the payout run's own function, on the room's own rates.
  const plan = (room.fee_plan as { rivalyBps: number; hostBps: number } | null) ?? { rivalyBps: room.fee_bps ?? 0, hostBps: room.host_fee_bps ?? 0 };
  const stakes = entries.map((e) => ({ id: e.id, side: e.side, amountCents: Number(e.amount_cents) }));
  const ifYes = planSettlement(stakes, "yes", plan);
  const ifNo = planSettlement(stakes, "no", plan);
  const yes = entries.filter((e) => e.side === "yes");
  const no = entries.filter((e) => e.side === "no");
  const sum = (xs: Entry[]) => xs.reduce((s, e) => s + Number(e.amount_cents), 0);
  const pool = sum(entries);
  const largest = entries.reduce((m, e) => Math.max(m, Number(e.amount_cents)), 0);
  const paid = entries.filter((e) => e.payout_tx_signature).reduce((s, e) => s + Number(e.payout_cents ?? 0), 0);
  const owed = entries.filter((e) => !e.payout_tx_signature && (e.payout_cents ?? 0) > 0).reduce((s, e) => s + Number(e.payout_cents ?? 0), 0);
  const multiplier = (side: typeof ifYes, sideTotal: number) => (sideTotal > 0 ? (side.payouts.reduce((s, p) => s + p.cents, 0) / sideTotal).toFixed(2) + "×" : "—");

  const people: Column<Entry>[] = [
    { label: "Person", cell: (e) => <Link href={`/admin/users/${e.user_id}`} className="hover:underline">{e.profile ? displayName(e.profile) : "—"}</Link> },
    { label: "Side", cell: (e) => <span style={{ color: e.side === "yes" ? "var(--yes)" : "var(--no)" }}>{e.side.toUpperCase()}{e.user_id === room.creator_id ? " · host" : ""}</span> },
    { label: "Stake", cell: (e) => usd(e.amount_cents), align: "right" },
    { label: "If YES wins", cell: (e) => usd(ifYes.payouts.find((p) => p.entryId === e.id)?.cents ?? 0), align: "right" },
    { label: "If NO wins", cell: (e) => usd(ifNo.payouts.find((p) => p.entryId === e.id)?.cents ?? 0), align: "right" },
    { label: "Result", cell: (e) => (e.payout_cents == null ? <span className="text-secondary">—</span> : <StatePill state={e.is_winner ? "ok" : e.is_winner === false ? "failed" : "pending"} label={e.is_winner ? "won" : e.is_winner === false ? "lost" : "refund"} />) },
    { label: "Paid", cell: (e) => (e.payout_cents != null ? usd(e.payout_cents) : "—"), align: "right" },
    { label: "Receipts", cell: (e) => (
      <span className="flex gap-2 text-caption">
        {e.stake_tx_signature && <a href={explorerTxUrl(e.stake_tx_signature)} target="_blank" rel="noopener noreferrer" className="text-secondary underline">stake ↗</a>}
        {e.payout_tx_signature && <a href={explorerTxUrl(e.payout_tx_signature)} target="_blank" rel="noopener noreferrer" className="text-secondary underline">payout ↗</a>}
      </span>
    ) },
    { label: "Joined", cell: (e) => <span className="text-secondary">{when(e.created_at)}</span> },
  ];

  const bigballs = match?.provider === "bigballs";
  const canAct = atLeast(me.role, "admin") && ["open", "live"].includes(room.status);

  return (
    <div>
      <PageHeader
        title={room.prediction}
        subtitle={
          <>
            <StatePill state={state} /> · {match ? `${match.home_team} v ${match.away_team}` : "match missing"} · hosted by{" "}
            {creator ? <Link href={`/admin/users/${creator.id}`} className="underline">{displayName(creator)}</Link> : "?"} · <Mono>{room.id}</Mono>
          </>
        }
        actions={<Link href={`/rooms/${room.id}`} className="text-label text-secondary underline">Open the room</Link>}
      />

      <Section title="Pool economics" hint={plan.rivalyBps + plan.hostBps ? `Fees: ${plan.rivalyBps / 100}% Rivaly + ${plan.hostBps / 100}% host, of winners' profit` : "No fees on this room"}>
        <KpiGrid>
          <Kpi label="Grand total" value={usd(pool)} sub={`${num(entries.length)} stakes`} />
          <Kpi label="YES" value={<span className="text-yes-ink">{usd(sum(yes))}</span>} sub={`${yes.length} people · pays ${multiplier(ifYes, sum(yes))}`} />
          <Kpi label="NO" value={<span className="text-no-ink">{usd(sum(no))}</span>} sub={`${no.length} people · pays ${multiplier(ifNo, sum(no))}`} />
          <Kpi label="Average · largest stake" value={`${usd(entries.length ? Math.round(pool / entries.length) : 0)}`} sub={`largest ${usd(largest)}`} />
          <Kpi label="Fees if YES / NO wins" value={`${usd(ifYes.rivalyCents + ifYes.hostCents)} / ${usd(ifNo.rivalyCents + ifNo.hostCents)}`} sub={`net losing pool ${usd(ifYes.profitCents)} / ${usd(ifNo.profitCents)}`} />
          <Kpi label="Paid out · still owed" value={usd(paid)} sub={owed ? `${usd(owed)} owed` : "nothing owed"} tone={owed ? "warn" : "neutral"} />
        </KpiGrid>
      </Section>

      <Section title="Participants & distribution">
        <DataTable columns={people} rows={entries} empty="No stakes." />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Match & verification">
          <div className="rounded-card bg-surface p-4 text-label edge">
            {match ? (
              <>
                <p className="text-foreground">
                  {match.home_team} {match.home_score ?? "–"}–{match.away_score ?? "–"} {match.away_team} · <StatePill state={match.status} />
                </p>
                <p className="mt-1 text-secondary">
                  {match.competition} · kickoff {when(match.kickoff_at, "full")} · data from <span className="text-foreground">{match.provider}</span> · last update {when(match.updated_at, "full")}
                </p>
                <p className="mt-3 text-caption text-secondary">
                  {bigballs
                    ? "Big Balls is this league's only source: full time is accepted only after the same finished score holds for 5 minutes; a goal taken back is recorded and restarts any early-lock safety window."
                    : "TxLINE streams every event; an early-decided result waits a 10-minute safety window with no corrections before it pays."}
                </p>
                <ol className="mt-3 max-h-64 overflow-y-auto border-t border-line pt-2">
                  {((matchEvents ?? []) as { action: string; minute: number | null; payload: Record<string, unknown> | null; occurred_at: string }[]).map((e, i) => (
                    <li key={i} className="flex gap-3 py-1 text-caption">
                      <span className="w-[112px] shrink-0 font-mono text-secondary">{when(e.occurred_at)}</span>
                      <span className="text-foreground">{e.action.replaceAll("_", " ")}</span>
                      {e.minute != null && <span className="text-secondary">{e.minute}&apos;</span>}
                      {typeof e.payload?._home === "number" && <span className="font-mono text-secondary">{String(e.payload._home)}–{String(e.payload._away)}</span>}
                    </li>
                  ))}
                  {(matchEvents ?? []).length === 0 && <li className="py-1 text-caption text-secondary">No match events yet.</li>}
                </ol>
              </>
            ) : (
              <p className="text-no-ink">This room&apos;s match can&apos;t be found.</p>
            )}
          </div>
        </Section>

        <Section title="Settlement">
          <div className="rounded-card bg-surface p-4 text-label edge">
            <dl className="grid grid-cols-[140px_1fr] gap-y-1.5">
              <dt className="text-secondary">State</dt>
              <dd><StatePill state={state} /></dd>
              <dt className="text-secondary">Early lock</dt>
              <dd>{room.pending_outcome ? `${room.pending_outcome.toUpperCase()} since ${when(room.pending_since, "full")}` : "—"}</dd>
              <dt className="text-secondary">Result</dt>
              <dd>{room.resolved_outcome ? `${room.resolved_outcome.toUpperCase()} at ${when(room.resolved_at, "full")}` : "not yet"}</dd>
              <dt className="text-secondary">Closed</dt>
              <dd>{room.settled_at ? when(room.settled_at, "full") : "—"}</dd>
              <dt className="text-secondary">Chat</dt>
              <dd>
                {num(chat.count)} messages{lastMsg?.[0] ? ` · last ${when(lastMsg[0].created_at)}` : ""}
              </dd>
              <dt className="text-secondary">Fees</dt>
              <dd>
                {((fees ?? []) as unknown as { kind: string; cents: number; claim: { status: string; payout_tx_signature: string | null } | null }[]).map((f) => (
                  <span key={f.kind} className="mr-3">
                    {f.kind}: {usd(f.cents)} ({f.claim?.status ?? "unclaimed"})
                  </span>
                ))}
                {(fees ?? []).length === 0 && "none recorded"}
              </dd>
            </dl>
            {canAct && (
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                <ActionButton label="Re-run settlement now" reason={false} action={rerunSettlement.bind(null, room.id)} help="Runs the same check the minute-by-minute cron does. Safe to repeat." />
                {!room.resolved_outcome && (
                  <ActionButton
                    label="Void & refund everyone"
                    danger
                    confirmWord="VOID"
                    action={voidRoom.bind(null, room.id)}
                    help="Ignores any result and refunds every stake in full through the normal payout run. Can't be undone."
                  />
                )}
              </div>
            )}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Room timeline">
          <ol className="rounded-card bg-surface edge">
            {events.map((e) => {
              const l = describeEvent(e, ctx);
              return (
                <li key={e.id} className="flex gap-3 border-b border-line px-4 py-2 text-label last:border-0">
                  <span className="w-[112px] shrink-0 font-mono text-caption leading-5 text-secondary">{when(e.at)}</span>
                  <span className="min-w-0 flex-1 leading-5">{l.text}</span>
                  {e.tx_signature && <a href={explorerTxUrl(e.tx_signature)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-caption text-secondary underline">tx ↗</a>}
                </li>
              );
            })}
            {events.length === 0 && <li className="px-4 py-4 text-label text-secondary">Nothing recorded.</li>}
          </ol>
        </Section>
        <Section title="Admin actions">
          <div className="rounded-card bg-surface edge">
            {((audit ?? []) as unknown as { id: string; at: string; action: string; reason: string | null; admin: { username: string } | null }[]).map((a) => (
              <div key={a.id} className="border-b border-line px-4 py-2 text-label last:border-0">
                {a.action.replaceAll("_", " ")}
                {a.reason && <span className="text-secondary"> — {a.reason}</span>}
                <p className="text-caption text-secondary">
                  {when(a.at)} · @{a.admin?.username ?? "admin"}
                </p>
              </div>
            ))}
            {(audit ?? []).length === 0 && <p className="px-4 py-4 text-label text-secondary">None.</p>}
          </div>
        </Section>
      </div>
    </div>
  );
}
