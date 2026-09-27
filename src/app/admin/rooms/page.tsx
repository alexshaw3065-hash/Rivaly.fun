import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { rpc } from "@/lib/admin/data";
import { DataTable, PageHeader, StatePill, num, usd, when, type Column } from "@/components/admin/ui";

// Every room and where it is in its life. States come from one database
// definition (admin_room_state): open → live → awaiting result → verifying
// (decided early, safety window) → settling (paying out) → settled /
// refunded / cancelled; stuck = still no result a day after kickoff.

interface Row {
  id: string;
  state: string;
  prediction: string;
  visibility: string;
  creator_id: string;
  creator_username: string | null;
  home_team: string | null;
  away_team: string | null;
  competition: string | null;
  kickoff_at: string | null;
  provider: string | null;
  participants: number;
  pool_cents: number;
  yes_cents: number;
  no_cents: number;
  fee_bps: number;
  host_fee_bps: number;
  resolved_outcome: string | null;
  created_at: string;
  settled_at: string | null;
  total_count: number;
}

const STATES = [
  ["all", "All"],
  ["open", "Open"],
  ["live", "Live"],
  ["pending", "Awaiting / verifying / settling"],
  ["stuck", "Stuck"],
  ["settled", "Settled"],
  ["refunded", "Refunded"],
  ["cancelled", "Cancelled"],
] as const;

const PAGE = 50;

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ state?: string; q?: string; page?: string }> }) {
  await requireAdmin();
  const { state = "all", q = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const rows = await rpc<Row[]>("admin_rooms", { p_state: state, p_search: q || null, p_limit: PAGE, p_offset: (p - 1) * PAGE });
  const total = rows[0]?.total_count ?? 0;

  const columns: Column<Row>[] = [
    { label: "Room", cell: (r) => <span className="font-medium">{r.prediction}</span> },
    { label: "State", cell: (r) => <StatePill state={r.state} /> },
    { label: "Match", cell: (r) => <span className="text-muted">{r.home_team ? `${r.home_team} v ${r.away_team}` : "—"}</span> },
    { label: "Kickoff", cell: (r) => <span className="text-muted">{when(r.kickoff_at)}</span> },
    { label: "Host", cell: (r) => <Link href={`/admin/users/${r.creator_id}`} className="text-muted hover:underline">@{r.creator_username ?? "?"}</Link> },
    { label: "People", cell: (r) => num(r.participants), align: "right" },
    { label: "Pot", cell: (r) => usd(r.pool_cents), align: "right" },
    { label: "YES", cell: (r) => <span className="text-rival-blue">{usd(r.yes_cents)}</span>, align: "right" },
    { label: "NO", cell: (r) => <span className="text-rival-red">{usd(r.no_cents)}</span>, align: "right" },
    { label: "Fees", cell: (r) => (r.fee_bps + r.host_fee_bps ? `${(r.fee_bps + r.host_fee_bps) / 100}%` : "—"), align: "right" },
    { label: "Result", cell: (r) => <span className="text-muted">{r.resolved_outcome?.toUpperCase() ?? "—"}</span> },
    { label: "Data", cell: (r) => <span className="text-[12px] text-muted">{r.provider ?? "—"}</span> },
    { label: "Created", cell: (r) => <span className="text-muted">{when(r.created_at)}</span> },
  ];
  const qs = (over: Record<string, string>) => `/admin/rooms?${new URLSearchParams({ state, ...(q ? { q } : {}), ...over })}`;

  return (
    <div>
      <PageHeader title="Rooms" subtitle={`${num(total)} ${state === "all" ? "rooms" : "matching"}`} />
      <form className="mb-3 flex gap-2" action="/admin/rooms">
        <input name="q" defaultValue={q} placeholder="Search claim, team, host or room id" className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground outline-none focus:border-border-strong" />
        <input type="hidden" name="state" value={state} />
        <button className="h-9 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background">Search</button>
      </form>
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {STATES.map(([id, label]) => (
          <Link key={id} href={qs({ state: id, page: "1" })} className="shrink-0 rounded-md px-2.5 py-1 text-[12px]" style={state === id ? { background: "var(--surface-elevated)", color: "var(--foreground)" } : { color: "var(--muted)" }}>
            {label}
          </Link>
        ))}
      </div>
      <DataTable columns={columns} rows={rows} rowHref={(r) => `/admin/rooms/${r.id}`} empty="No rooms here." />
      {total > PAGE && (
        <div className="mt-3 flex items-center gap-3 text-[13px] text-muted">
          {p > 1 && <Link href={qs({ page: String(p - 1) })}>← Newer</Link>}
          <span>
            Page {p} of {Math.ceil(total / PAGE)}
          </span>
          {p * PAGE < total && <Link href={qs({ page: String(p + 1) })}>Older →</Link>}
        </div>
      )}
    </div>
  );
}
