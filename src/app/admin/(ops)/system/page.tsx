import { requireAdmin } from "@/lib/admin/guard";
import { db, eventContext, loadEvents } from "@/lib/admin/data";
import { describeEvent } from "@/lib/admin/events";
import { runChecks, workerHealth } from "@/lib/admin/health";
import { DataTable, Kpi, KpiGrid, PageHeader, Section, StatePill, Tabs, num, when, type Column } from "@/components/admin/ui";
import { LiveStream } from "@/components/admin/live-stream";

// Is everything working? Live checks against every dependency, the two
// score feeds in detail, every job run, every error, and the audit log.

const TABS = [
  { id: "health", label: "Health" },
  { id: "providers", label: "Match data providers" },
  { id: "jobs", label: "Jobs & workers" },
  { id: "errors", label: "Errors" },
  { id: "audit", label: "Audit log" },
];

export default async function SystemPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab = "health" } = await searchParams;
  return (
    <div>
      <PageHeader title="System" subtitle="Checked live every time this page loads." />
      <Tabs tabs={TABS} active={tab} base="/admin/system" />
      {tab === "health" && <Health />}
      {tab === "providers" && <Providers />}
      {tab === "jobs" && <Jobs />}
      {tab === "errors" && <Errors />}
      {tab === "audit" && <Audit />}
    </div>
  );
}

async function Health() {
  const { checks } = await runChecks();
  const bad = checks.filter((c) => !c.ok).length;
  return (
    <>
      <p className="mb-4 text-body" style={{ color: bad ? "var(--no)" : "var(--money)" }}>
        {bad ? `${bad} of ${checks.length} checks failing` : `All ${checks.length} checks passing`}
      </p>
      <div className="rounded-card bg-surface edge">
        {checks.map((c) => (
          <div key={c.name} className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
            <div className="min-w-0">
              <p className="text-body text-foreground">{c.name}</p>
              <p className="mt-0.5 break-words text-caption text-secondary">{c.detail}</p>
            </div>
            <div className="flex items-center gap-3">
              {c.ms != null && <span className="font-mono text-caption text-secondary">{c.ms}ms</span>}
              <StatePill state={c.ok ? "ok" : "failed"} label={c.ok ? "ok" : "failing"} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function Providers() {
  const w = await workerHealth();
  const bb = w?.bigballs;
  const { data: comps } = await db().from("tracked_competitions").select("provider, name, enabled, scores_available, provider_code").order("provider");
  type C = { provider: string; name: string; enabled: boolean; scores_available: boolean; provider_code: string | null };
  return (
    <>
      <Section title="TxLINE — Premier League, NFL (push stream)">
        <KpiGrid>
          <Kpi label="Stream" value={w ? (w.connected ? "Connected" : "Disconnected") : "Worker unreachable"} tone={w?.connected ? "good" : "bad"} />
          <Kpi label="Last event" value={<span className="text-body">{when(w?.lastEventAt)}</span>} />
          <Kpi label="Messages · applied" value={`${num(w?.messages)} · ${num(w?.applied)}`} />
          <Kpi label="Reconnects" value={num(w?.reconnects)} />
          <Kpi label="Worker up since" value={<span className="text-body">{when(w?.startedAt)}</span>} />
          <Kpi label="Last stream error" value={<span className="text-caption">{w?.lastError ?? "none"}</span>} tone={w?.lastError ? "warn" : "neutral"} />
        </KpiGrid>
      </Section>
      <Section title="Big Balls — UCL, La Liga, Bundesliga, Serie A, Ligue 1, MLS (polled, 500 calls/day)">
        <KpiGrid>
          <Kpi label="Status" value={bb?.on ? "Running" : "Off"} tone={bb?.on ? "good" : "bad"} />
          <Kpi label="Calls today" value={`${num(bb?.callsToday)}/500`} tone={(bb?.callsToday ?? 0) > 400 ? "warn" : "neutral"} sub="resets 00:00 UTC; 30 held back for confirmations" />
          <Kpi label="Next poll" value={bb?.nextPollInS != null ? `${bb.nextPollInS}s` : "—"} sub="60s live · 45s late · stretched if the day runs short" />
          <Kpi label="Last live poll" value={<span className="text-body">{when(bb?.lastPollAt)}</span>} sub={bb?.lastPoll ? `${bb.lastPoll.polled} matches · ${bb.lastPoll.goals} goals · ${bb.lastPoll.confirmedFinals} finals` : "no live rooms"} />
          <Kpi label="Last fixtures pull" value={<span className="text-body">{when(bb?.lastFixturesAt)}</span>} sub={bb?.lastFixtures ? `${bb.lastFixtures.leagues} leagues · ${num(bb.lastFixtures.fetched)} matches` : undefined} />
          <Kpi label="Last error" value={<span className="text-caption">{bb?.lastError ?? "none"}</span>} tone={bb?.lastError ? "warn" : "neutral"} />
        </KpiGrid>
      </Section>
      <Section title="Competitions">
        <DataTable
          columns={[
            { label: "Competition", cell: (c: C) => c.name },
            { label: "Provider", cell: (c: C) => <span className="text-secondary">{c.provider}{c.provider_code ? ` · ${c.provider_code}` : ""}</span> },
            { label: "Fixtures", cell: (c: C) => <StatePill state={c.enabled ? "ok" : "cancelled"} label={c.enabled ? "syncing" : "off"} /> },
            { label: "In Create Room", cell: (c: C) => <StatePill state={c.scores_available ? "ok" : "cancelled"} label={c.scores_available ? "offered" : "hidden"} /> },
          ] as Column<C>[]}
          rows={(comps ?? []) as C[]}
        />
      </Section>
    </>
  );
}

/** A job run that failed in the last 24 hours (server-rendered, so "now" is request time). */
function failedInLastDay(r: { ok: boolean | null; started_at: string }): boolean {
  return r.ok === false && Date.now() - +new Date(r.started_at) < 86_400_000;
}

async function Jobs() {
  const { data } = await db().from("job_runs").select("id, job, started_at, finished_at, ok, detail").order("started_at", { ascending: false }).limit(300);
  type J = { id: string; job: string; started_at: string; finished_at: string | null; ok: boolean | null; detail: Record<string, unknown> };
  const runs = (data ?? []) as J[];
  const latest = new Map<string, J>();
  for (const r of runs) if (!latest.has(r.job)) latest.set(r.job, r);
  const failed24 = runs.filter(failedInLastDay).length;
  const cols: Column<J>[] = [
    { label: "Job", cell: (r) => <span className="font-mono text-caption">{r.job}</span> },
    { label: "Started", cell: (r) => <span className="font-mono text-caption text-secondary">{when(r.started_at, "full")}</span> },
    { label: "Took", cell: (r) => (typeof r.detail?.ms === "number" ? `${r.detail.ms}ms` : "—"), align: "right" },
    { label: "Result", cell: (r) => <StatePill state={r.ok === null ? "pending" : r.ok ? "ok" : "failed"} label={r.ok === null ? "running" : r.ok ? "ok" : "failed"} /> },
    { label: "Detail", cell: (r) => <span className="line-clamp-2 max-w-lg break-all font-mono text-caption text-secondary">{JSON.stringify(r.detail).slice(0, 240)}</span> },
  ];
  return (
    <>
      <KpiGrid>
        {[...latest.values()].map((j) => (
          <Kpi key={j.job} label={j.job} value={<StatePill state={j.ok ? "ok" : j.ok === false ? "failed" : "pending"} label={j.ok ? "ok" : j.ok === false ? "failed" : "running"} />} sub={`last ${when(j.started_at)}`} />
        ))}
        <Kpi label="Failures (24h)" value={num(failed24)} tone={failed24 ? "bad" : "good"} />
      </KpiGrid>
      <p className="mt-3 text-caption text-secondary">
        Settlement runs every minute (Render worker → /api/cron/settle). Big Balls fixtures every 6h; live polls are logged only when they called the API. Runs older than 14 days are pruned.
      </p>
      <div className="mt-4">
        <DataTable columns={cols} rows={runs} empty="No job runs recorded yet — they appear after the next cron call." />
      </div>
    </>
  );
}

async function Errors() {
  const events = await loadEvents({ types: ["SYSTEM_ERROR", "SETTLEMENT_FAILED", "STAKE_FAILED", "CLAIM_FAILED"], limit: 150 });
  const ctx = await eventContext(events);
  return <LiveStream initial={events.map((e) => ({ id: e.id, at: e.at, type: e.type, status: e.status, ...describeEvent(e, ctx) }))} limit={150} />;
}

async function Audit() {
  const { data } = await db().from("admin_audit").select("id, at, action, target_type, target_id, reason, before, after, admin:profiles!admin_audit_admin_id_fkey(username)").order("at", { ascending: false }).limit(300);
  type A = { id: string; at: string; action: string; target_type: string; target_id: string | null; reason: string | null; before: unknown; after: unknown; admin: { username: string } | null };
  const cols: Column<A>[] = [
    { label: "When", cell: (r) => <span className="font-mono text-caption text-secondary">{when(r.at, "full")}</span> },
    { label: "Admin", cell: (r) => `@${r.admin?.username ?? "?"}` },
    { label: "Action", cell: (r) => r.action.replaceAll("_", " ") },
    { label: "Target", cell: (r) => <span className="text-secondary">{r.target_type}{r.target_id ? ` · ${r.target_id.slice(0, 8)}` : ""}</span> },
    { label: "Reason", cell: (r) => <span className="text-caption text-secondary">{r.reason ?? "—"}</span> },
    { label: "Change", cell: (r) => <span className="line-clamp-2 max-w-md break-all font-mono text-caption text-secondary">{r.after ? JSON.stringify(r.after).slice(0, 200) : "—"}</span> },
  ];
  return <DataTable columns={cols} rows={(data ?? []) as unknown as A[]} empty="No admin actions yet." />;
}
