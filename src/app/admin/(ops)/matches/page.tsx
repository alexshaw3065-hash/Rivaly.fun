import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { db, rpc } from "@/lib/admin/data";
import { workerHealth } from "@/lib/admin/health";
import { DataTable, Kpi, KpiGrid, PageHeader, Section, StatePill, num, usd, when, type Column } from "@/components/admin/ui";

// The matches behind the rooms: which provider scores each one, when it last
// updated, whether its full time is confirmed, and how much money rides on
// it. "Problems" = live but silent for 15 minutes, past kickoff but never
// started, or finished without a score.

interface Row {
  id: string;
  provider: string;
  competition: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  updated_at: string;
  rooms: number;
  open_rooms: number;
  pool_cents: number;
  final_confirmed: boolean;
  events: number;
  last_event_at: string | null;
}

const VIEWS = [
  ["with_rooms", "With rooms"],
  ["live", "Live now"],
  ["today", "Today"],
  ["upcoming", "Next 7 days"],
  ["problems", "Data problems"],
] as const;

type Miss = { kind: string; name: string; reason: string | null; attempts: number; tried_at: string };

async function crestHealth(): Promise<{ teams: number; leagues: number; misses: Miss[] }> {
  const [teams, leagues, misses] = await Promise.all([
    db().from("crests").select("*", { count: "exact", head: true }).eq("kind", "team"),
    db().from("crests").select("*", { count: "exact", head: true }).eq("kind", "league"),
    db().from("crest_misses").select("kind, name, reason, attempts, tried_at").order("tried_at", { ascending: false }).limit(100),
  ]);
  return { teams: teams.count ?? 0, leagues: leagues.count ?? 0, misses: (misses.data ?? []) as Miss[] };
}

function verification(r: Row): { state: string; label: string } {
  if (r.status === "finished") return r.final_confirmed ? { state: "ok", label: "result confirmed" } : r.home_score == null ? { state: "failed", label: "no score" } : { state: "pending", label: "finished, not confirmed" };
  if (r.status === "live") return Date.now() - +new Date(r.updated_at) > 15 * 60_000 ? { state: "failed", label: "silent 15m+" } : { state: "ok", label: "updating" };
  if (r.status === "postponed" || r.status === "cancelled") return { state: "pending", label: "rooms void" };
  if (+new Date(r.kickoff_at) < Date.now() - 3 * 3600_000) return { state: "failed", label: "never started" };
  return { state: "scheduled", label: "upcoming" };
}

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireAdmin();
  const { view = "with_rooms" } = await searchParams;
  const [rows, worker, crestStats] = await Promise.all([rpc<Row[]>("admin_matches", { p_view: view, p_limit: 200 }), workerHealth(), crestHealth()]);
  const bb = worker?.bigballs;

  const columns: Column<Row>[] = [
    { label: "Match", cell: (r) => <span className="font-medium">{r.home_team} v {r.away_team}</span> },
    { label: "Competition", cell: (r) => <span className="text-muted">{r.competition}</span> },
    { label: "Kickoff", cell: (r) => <span className="text-muted">{when(r.kickoff_at)}</span> },
    { label: "Status", cell: (r) => <StatePill state={r.status} /> },
    { label: "Score", cell: (r) => (r.home_score == null ? "—" : `${r.home_score}–${r.away_score}`), align: "right" },
    { label: "Provider", cell: (r) => <span className="text-[12px] text-muted">{r.provider}</span> },
    { label: "Last update", cell: (r) => <span className="text-muted">{when(r.updated_at)}</span> },
    { label: "Verification", cell: (r) => { const v = verification(r); return <StatePill state={v.state} label={v.label} />; } },
    { label: "Rooms", cell: (r) => (r.rooms ? <Link href={`/admin/rooms?q=${encodeURIComponent(r.home_team)}`} className="underline">{r.rooms} ({r.open_rooms} open)</Link> : "—"), align: "right" },
    { label: "Money on it", cell: (r) => usd(r.pool_cents), align: "right" },
    { label: "Events", cell: (r) => num(r.events), align: "right" },
  ];

  return (
    <div>
      <PageHeader title="Matches" subtitle="Where every room's result comes from, and whether it's healthy." />
      <Section title="Data providers">
        <KpiGrid>
          <Kpi label="TxLINE stream" value={worker ? (worker.connected ? "Connected" : "Down") : "Unreachable"} tone={worker?.connected ? "good" : "bad"} sub={worker?.lastEventAt ? `last event ${when(worker.lastEventAt)}` : "Premier League, NFL"} href="/admin/system?tab=providers" />
          <Kpi label="TxLINE records applied" value={num(worker?.applied)} sub={`${num(worker?.reconnects)} reconnects`} />
          <Kpi label="Big Balls" value={bb?.on ? (bb.lastError ? "Errors" : "Running") : "Off"} tone={bb?.on && !bb.lastError ? "good" : "bad"} sub="UCL, La Liga, Bundesliga, Serie A, Ligue 1, MLS" href="/admin/system?tab=providers" />
          <Kpi label="Big Balls calls today" value={`${num(bb?.callsToday)}/500`} tone={(bb?.callsToday ?? 0) > 400 ? "warn" : "neutral"} sub={bb?.nextPollInS ? `next poll in ${bb.nextPollInS}s` : undefined} />
          <Kpi label="Last fixtures pull" value={<span className="text-[15px]">{when(bb?.lastFixturesAt)}</span>} sub={bb?.lastFixtures ? `${bb.lastFixtures.leagues} leagues · ${num(bb.lastFixtures.fetched)} matches` : undefined} />
          <Kpi label="Goals from last poll" value={num(bb?.lastPoll?.goals)} sub={bb?.lastPoll ? `${bb.lastPoll.polled} matches · ${bb.lastPoll.confirmedFinals} finals confirmed` : "no live rooms"} />
        </KpiGrid>
      </Section>
      <Section title="Badges" hint="Real team and league badges from TheSportsDB, synced hourly. A name with no certain match keeps its monogram — fix the feed name or leave it.">
        <p className="mb-3 text-[13px] text-muted">
          {num(crestStats.teams)} team badges · {num(crestStats.leagues)} league badges · {num(crestStats.misses.length)} without a match
        </p>
        {crestStats.misses.length > 0 && (
          <DataTable
            columns={
              [
                { label: "Name", cell: (m: Miss) => m.name },
                { label: "Kind", cell: (m: Miss) => <span className="text-muted">{m.kind}</span> },
                { label: "Why", cell: (m: Miss) => <span className="text-muted">{m.reason}</span> },
                { label: "Tries", cell: (m: Miss) => num(m.attempts), align: "right" },
                { label: "Last tried", cell: (m: Miss) => <span className="text-muted">{when(m.tried_at)}</span> },
              ] as Column<Miss>[]
            }
            rows={crestStats.misses}
            empty=""
          />
        )}
      </Section>
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {VIEWS.map(([id, label]) => (
          <Link key={id} href={`/admin/matches?view=${id}`} className="shrink-0 rounded-md px-2.5 py-1 text-[12px]" style={view === id ? { background: "var(--surface-elevated)", color: "var(--foreground)" } : { color: "var(--muted)" }}>
            {label}
          </Link>
        ))}
      </div>
      <DataTable columns={columns} rows={rows} empty={view === "problems" ? "No data problems." : "No matches here."} />
    </div>
  );
}
