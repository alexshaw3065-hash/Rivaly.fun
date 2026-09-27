import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { displayName, rpc } from "@/lib/admin/data";
import { DataTable, PageHeader, StatePill, num, usd, when, type Column } from "@/components/admin/ui";

// Everyone on Rivaly, with what they've done and whether anything's wrong.
// Search by username, name, user id or wallet; filter by state.

interface Row {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  last_active: string | null;
  wallet: string | null;
  rooms_created: number;
  rooms_joined: number;
  predictions: number;
  staked_cents: number;
  won_cents: number;
  lost_cents: number;
  host_fees_cents: number;
  decided: number;
  wins: number;
  suspended_until: string | null;
  banned_at: string | null;
  reports_received: number;
  open_flags: number;
  total_count: number;
}

const FILTERS = [
  ["all", "All"],
  ["new", "New (7 days)"],
  ["active", "Active (7 days)"],
  ["inactive", "Inactive (30 days)"],
  ["high_volume", "High volume ($100+)"],
  ["wallet", "Wallet ready"],
  ["no_wallet", "No wallet"],
  ["reported", "Reported"],
  ["flagged", "Flagged"],
  ["suspended", "Suspended"],
  ["banned", "Banned"],
] as const;

const PAGE = 50;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  await requireAdmin();
  const { q = "", filter = "all", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const rows = await rpc<Row[]>("admin_users", { p_search: q || null, p_filter: filter, p_limit: PAGE, p_offset: (p - 1) * PAGE });
  const total = rows[0]?.total_count ?? 0;

  const status = (r: Row) => (r.banned_at ? "banned" : r.suspended_until && new Date(r.suspended_until) > new Date() ? "suspended" : "active");
  const columns: Column<Row>[] = [
    { label: "User", cell: (r) => <span className="font-medium">{displayName(r)}</span> },
    { label: "Username", cell: (r) => <span className="text-muted">@{r.username}</span> },
    { label: "Joined", cell: (r) => <span className="text-muted">{when(r.created_at)}</span> },
    { label: "Last active", cell: (r) => <span className="text-muted">{r.last_active ?? "—"}</span> },
    { label: "Joined rooms", cell: (r) => num(r.rooms_joined), align: "right" },
    { label: "Hosted", cell: (r) => num(r.rooms_created), align: "right" },
    { label: "Stakes", cell: (r) => num(r.predictions), align: "right" },
    { label: "Staked", cell: (r) => usd(r.staked_cents), align: "right" },
    { label: "Won", cell: (r) => <span className="text-rival-green">{usd(r.won_cents)}</span>, align: "right" },
    { label: "Lost", cell: (r) => usd(r.lost_cents), align: "right" },
    { label: "Host fees", cell: (r) => usd(r.host_fees_cents), align: "right" },
    { label: "Win rate", cell: (r) => (r.decided ? `${Math.round((r.wins / r.decided) * 100)}%` : "—"), align: "right" },
    { label: "Wallet", cell: (r) => (r.wallet ? <span className="font-mono text-[11px] text-muted">{r.wallet.slice(0, 4)}…{r.wallet.slice(-4)}</span> : <span className="text-muted">—</span>) },
    { label: "Status", cell: (r) => <StatePill state={status(r)} /> },
    {
      label: "Risk",
      cell: (r) =>
        r.reports_received || r.open_flags ? (
          <span className="text-[12px] text-[#f5a524]">
            {r.reports_received ? `${r.reports_received} report${r.reports_received === 1 ? "" : "s"}` : ""}
            {r.reports_received && r.open_flags ? " · " : ""}
            {r.open_flags ? `${r.open_flags} flag${r.open_flags === 1 ? "" : "s"}` : ""}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const qs = (over: Record<string, string>) => {
    const params = new URLSearchParams({ ...(q ? { q } : {}), filter, ...over });
    return `/admin/users?${params}`;
  };

  return (
    <div>
      <PageHeader title="Users" subtitle={`${num(total)} ${filter === "all" ? "people" : "matching"}`} />
      <form className="mb-3 flex gap-2" action="/admin/users">
        <input name="q" defaultValue={q} placeholder="Search username, name, user id or wallet" className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground outline-none focus:border-border-strong" />
        <input type="hidden" name="filter" value={filter} />
        <button className="h-9 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background">Search</button>
      </form>
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto">
        {FILTERS.map(([id, label]) => (
          <Link key={id} href={qs({ filter: id, page: "1" })} className="shrink-0 rounded-md px-2.5 py-1 text-[12px]" style={filter === id ? { background: "var(--surface-elevated)", color: "var(--foreground)" } : { color: "var(--muted)" }}>
            {label}
          </Link>
        ))}
      </div>
      <DataTable columns={columns} rows={rows} rowHref={(r) => `/admin/users/${r.id}`} empty="No one matches." />
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
