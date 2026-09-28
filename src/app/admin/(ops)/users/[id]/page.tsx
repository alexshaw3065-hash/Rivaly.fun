import Link from "next/link";
import { notFound } from "next/navigation";
import { atLeast, requireAdmin } from "@/lib/admin/guard";
import { db, displayName, eventContext, loadEvents, rpc } from "@/lib/admin/data";
import { describeEvent } from "@/lib/admin/events";
import { DataTable, Kpi, KpiGrid, Mono, PageHeader, Section, StatePill, num, usd, when, type Column } from "@/components/admin/ui";
import { ActionButton, FlagForm, NoteForm, SmallAction, SuspendForm } from "@/components/admin/admin-forms";
import { addFlag, addNote, banUser, clearFlag, liftRestriction, suspendUser } from "@/app/admin/actions";
import { explorerTxUrl } from "@/lib/wallet/constants";

// One person, operationally: who they are, what they've done, their money,
// every prediction, anything reported or flagged, what admins have done —
// and the whole story as a timeline.

interface Stats {
  last_active: string | null;
  rooms_created: number;
  rooms_joined: number;
  predictions: number;
  staked_cents: number;
  won_cents: number;
  lost_cents: number;
  host_fees_cents: number;
  decided: number;
  wins: number;
  reports_received: number;
}

interface EntryRow {
  id: string;
  side: "yes" | "no";
  amount_cents: number;
  created_at: string;
  is_winner: boolean | null;
  payout_cents: number | null;
  stake_tx_signature: string | null;
  payout_tx_signature: string | null;
  room: { id: string; prediction: string; status: string; resolved_outcome: string | null; match_id: string } | null;
}

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const admin = db();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [statsRows, { data: entries }, msgs, posts, areactions, mreactions, following, followers, txs, failed, { data: postIds }, { data: msgIds }, { data: flags }, { data: notes }, { data: audit }, events, { data: role }] =
    await Promise.all([
      rpc<Stats[]>("admin_users", { p_search: id, p_filter: "all", p_limit: 1 }),
      admin
        .from("entries")
        .select("id, side, amount_cents, created_at, is_winner, payout_cents, stake_tx_signature, payout_tx_signature, room:rooms(id, prediction, status, resolved_outcome, match_id)")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      admin.from("messages").select("id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("posts").select("id", { count: "exact", head: true }).eq("author_id", id),
      admin.from("arena_reactions").select("user_id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("message_reactions").select("user_id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
      admin.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
      admin.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("stake_intents").select("id", { count: "exact", head: true }).eq("user_id", id).eq("status", "failed"),
      admin.from("posts").select("id").eq("author_id", id).limit(500),
      admin.from("messages").select("id").eq("user_id", id).limit(500),
      admin.from("user_flags").select("id, flag, note, created_at, cleared_at, admin:profiles!user_flags_admin_id_fkey(username)").eq("user_id", id).order("created_at", { ascending: false }),
      admin.from("admin_notes").select("id, body, created_at, admin:profiles!admin_notes_admin_id_fkey(username)").eq("user_id", id).order("created_at", { ascending: false }),
      admin.from("admin_audit").select("id, at, action, reason, admin:profiles!admin_audit_admin_id_fkey(username)").eq("target_type", "user").eq("target_id", id).order("at", { ascending: false }).limit(50),
      loadEvents({ userId: id, limit: 150 }),
      admin.from("admins").select("role").eq("user_id", id).maybeSingle(),
    ]);
  const stats = statsRows[0];
  const ids = [...((postIds ?? []) as { id: string }[]).map((p) => p.id), ...((msgIds ?? []) as { id: string }[]).map((m) => m.id)];
  const { data: reports } = ids.length
    ? await admin.from("content_reports").select("target_kind, target_id, reason, created_at, resolution").in("target_id", ids).order("created_at", { ascending: false })
    : { data: [] };
  const matchIds = [...new Set(((entries ?? []) as unknown as EntryRow[]).map((e) => e.room?.match_id).filter(Boolean))] as string[];
  const { data: matches } = matchIds.length ? await admin.from("matches").select("id, home_team, away_team").in("id", matchIds) : { data: [] };
  const matchName = new Map(((matches ?? []) as { id: string; home_team: string; away_team: string }[]).map((m) => [m.id, `${m.home_team} v ${m.away_team}`]));
  const ctx = await eventContext(events);

  const restricted = profile.banned_at ? "banned" : profile.suspended_until && new Date(profile.suspended_until) > new Date() ? "suspended" : "active";
  const history: Column<EntryRow>[] = [
    { label: "Match", cell: (e) => <span className="text-secondary">{e.room ? matchName.get(e.room.match_id) ?? "—" : "—"}</span> },
    { label: "Room", cell: (e) => (e.room ? <Link href={`/admin/rooms/${e.room.id}`} className="hover:underline">{e.room.prediction}</Link> : "—") },
    { label: "Side", cell: (e) => <span style={{ color: e.side === "yes" ? "var(--yes)" : "var(--no)" }}>{e.side.toUpperCase()}</span> },
    { label: "Stake", cell: (e) => usd(e.amount_cents), align: "right" },
    { label: "Result", cell: (e) => <StatePill state={e.is_winner === true ? "ok" : e.is_winner === false ? "failed" : e.payout_cents != null ? "pending" : "open"} label={e.is_winner === true ? "won" : e.is_winner === false ? "lost" : e.payout_cents != null ? "refunded" : e.room?.status ?? "open"} /> },
    { label: "Payout", cell: (e) => (e.payout_cents != null ? usd(e.payout_cents) : "—"), align: "right" },
    { label: "Receipts", cell: (e) => (
      <span className="flex gap-2 text-caption">
        {e.stake_tx_signature && <a href={explorerTxUrl(e.stake_tx_signature)} target="_blank" rel="noopener noreferrer" className="text-secondary underline">stake</a>}
        {e.payout_tx_signature && <a href={explorerTxUrl(e.payout_tx_signature)} target="_blank" rel="noopener noreferrer" className="text-secondary underline">payout</a>}
      </span>
    ) },
    { label: "When", cell: (e) => <span className="text-secondary">{when(e.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title={displayName(profile)}
        subtitle={
          <>
            @{profile.username} · <Mono>{profile.id}</Mono> {role?.role && <> · <span className="text-foreground">{role.role}</span></>}
          </>
        }
        actions={
          <Link href={`/profile/${profile.username}`} className="text-label text-secondary underline">
            View public profile
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          <Section title="Identity">
            <KpiGrid>
              <Kpi label="Status" value={<StatePill state={restricted} />} sub={profile.moderation_reason ?? undefined} />
              <Kpi label="Joined" value={<span className="text-body">{when(profile.created_at)}</span>} />
              <Kpi label="Last active" value={<span className="text-body">{stats?.last_active ?? "—"}</span>} />
              <Kpi label="Wallet" value={<span className="break-all text-caption">{profile.dynamic_wallet_address ?? "not set up"}</span>} />
              <Kpi label="Followers" value={num(followers.count)} sub={`following ${num(following.count)}`} />
              <Kpi label="Reports against" value={num(stats?.reports_received)} tone={stats?.reports_received ? "warn" : "neutral"} />
            </KpiGrid>
          </Section>

          <Section title="Activity">
            <KpiGrid>
              <Kpi label="Rooms hosted" value={num(stats?.rooms_created)} />
              <Kpi label="Rooms joined" value={num(stats?.rooms_joined)} />
              <Kpi label="Stakes" value={num(stats?.predictions)} />
              <Kpi label="Chat messages" value={num(msgs.count)} />
              <Kpi label="Arena posts" value={num(posts.count)} />
              <Kpi label="Reactions" value={num((areactions.count ?? 0) + (mreactions.count ?? 0))} />
            </KpiGrid>
          </Section>

          <Section title="Money">
            <KpiGrid>
              <Kpi label="Total staked" value={usd(stats?.staked_cents)} />
              <Kpi label="Won (profit)" value={usd(stats?.won_cents)} tone="good" />
              <Kpi label="Lost" value={usd(stats?.lost_cents)} />
              <Kpi label="Win rate" value={stats?.decided ? `${Math.round((stats.wins / stats.decided) * 100)}%` : "—"} sub={`${num(stats?.wins)} of ${num(stats?.decided)} decided`} />
              <Kpi label="Fees from rooms they host" value={usd(stats?.host_fees_cents)} />
              <Kpi label="Wallet transactions" value={num(txs.count)} sub={`${num(failed.count)} failed stakes`} tone={failed.count ? "warn" : "neutral"} />
            </KpiGrid>
          </Section>

          <Section title="Prediction history">
            <DataTable columns={history} rows={(entries ?? []) as unknown as EntryRow[]} empty="No stakes yet." />
          </Section>

          <Section title="Timeline">
            {events.length === 0 ? (
              <p className="text-label text-secondary">Nothing recorded yet.</p>
            ) : (
              <ol className="rounded-card bg-surface edge">
                {events.map((e) => {
                  const l = describeEvent(e, ctx);
                  return (
                    <li key={e.id} className="flex gap-3 border-b border-line px-4 py-2 text-label last:border-0">
                      <span className="w-[120px] shrink-0 font-mono text-caption leading-5 text-secondary">{when(e.at)}</span>
                      <span className="min-w-0 flex-1 leading-5">{l.href ? <Link href={l.href} className="hover:underline">{l.text}</Link> : l.text}</span>
                      {e.status !== "ok" && <StatePill state={e.status} />}
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        </div>

        <div>
          <Section title="Controls">
            <div className="flex flex-col gap-4 rounded-card bg-surface p-4 edge">
              {restricted !== "active" ? (
                <ActionButton label={restricted === "banned" ? "Lift ban" : "Lift suspension"} action={liftRestriction.bind(null, id)} />
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-caption text-secondary">Suspend: can&apos;t stake, post or chat until it ends.</p>
                    <SuspendForm action={suspendUser.bind(null, id)} />
                  </div>
                  {atLeast(me.role, "admin") && (
                    <div className="border-t border-line pt-4">
                      <p className="mb-2 text-caption text-secondary">Ban: indefinitely. Money already in rooms still settles normally.</p>
                      <ActionButton label="Ban" danger confirmWord="BAN" action={banUser.bind(null, id)} />
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>

          <Section title="Flags">
            <div className="flex flex-col gap-3 rounded-card bg-surface p-4 edge">
              {((flags ?? []) as unknown as { id: string; flag: string; note: string | null; created_at: string; cleared_at: string | null; admin: { username: string } | null }[]).map((f) => (
                <div key={f.id} className="text-label" style={{ opacity: f.cleared_at ? 0.5 : 1 }}>
                  <span className="font-medium text-[#f5a524]">{f.flag.replaceAll("_", " ")}</span>
                  {f.note && <span className="text-secondary"> — {f.note}</span>}
                  <p className="text-caption text-secondary">
                    {when(f.created_at)} by @{f.admin?.username ?? "admin"}
                    {f.cleared_at ? " · cleared" : <> · <SmallAction label="clear" action={clearFlag.bind(null, f.id, id)} /></>}
                  </p>
                </div>
              ))}
              <FlagForm action={addFlag.bind(null, id)} />
            </div>
          </Section>

          <Section title="Admin notes">
            <div className="flex flex-col gap-3 rounded-card bg-surface p-4 edge">
              {((notes ?? []) as unknown as { id: string; body: string; created_at: string; admin: { username: string } | null }[]).map((n) => (
                <div key={n.id} className="text-label">
                  <p className="whitespace-pre-wrap text-foreground">{n.body}</p>
                  <p className="text-caption text-secondary">
                    {when(n.created_at)} · @{n.admin?.username ?? "admin"}
                  </p>
                </div>
              ))}
              <NoteForm action={addNote.bind(null, id)} />
            </div>
          </Section>

          <Section title="Reports against their content">
            <div className="rounded-card bg-surface edge">
              {(reports ?? []).length === 0 && <p className="px-4 py-4 text-label text-secondary">None.</p>}
              {((reports ?? []) as { target_kind: string; target_id: string; reason: string; created_at: string; resolution: string | null }[]).map((r, i) => (
                <div key={i} className="border-b border-line px-4 py-2 text-label last:border-0">
                  {r.target_kind} · {r.reason} <span className="text-secondary">· {when(r.created_at)}</span> {r.resolution && <StatePill state={r.resolution === "removed" ? "failed" : "ok"} label={r.resolution} />}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Moderation history">
            <div className="rounded-card bg-surface edge">
              {(audit ?? []).length === 0 && <p className="px-4 py-4 text-label text-secondary">No admin actions.</p>}
              {((audit ?? []) as unknown as { id: string; at: string; action: string; reason: string | null; admin: { username: string } | null }[]).map((a) => (
                <div key={a.id} className="border-b border-line px-4 py-2 text-label last:border-0">
                  <span className="text-foreground">{a.action.replaceAll("_", " ")}</span>
                  {a.reason && <span className="text-secondary"> — {a.reason}</span>}
                  <p className="text-caption text-secondary">
                    {when(a.at)} · @{a.admin?.username ?? "admin"}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
