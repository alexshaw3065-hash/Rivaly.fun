import { atLeast, requireAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/admin/data";
import { DATASETS } from "@/lib/data/datasets";
import { DataTable, Kpi, KpiGrid, PageHeader, Section, StatePill, Tabs, num, usd, when, type Column } from "@/components/admin/ui";
import { IssueKeyButton, MinGroupForm, PartnerEdit, PartnerForm, SmallAction } from "@/components/admin/admin-forms";
import { createPartner, issueKey, revokeKey, setDataMinGroup, updatePartner } from "@/app/admin/actions";

// Rivaly Data: the anonymised datasets Rivaly can license, one-click exports
// of everything, the partners who buy access, their keys, and metered usage.

const TABS = [
  { id: "catalog", label: "Catalog & preview" },
  { id: "exports", label: "Exports" },
  { id: "partners", label: "Partners & keys" },
  { id: "usage", label: "Usage" },
  { id: "docs", label: "API docs" },
];

export default async function DataPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireAdmin("admin");
  const { tab = "catalog" } = await searchParams;
  return (
    <div>
      <PageHeader title="Rivaly Data" subtitle="Aggregated, anonymised football-fan data — previewed, exported, and licensed to partners through a metered API." />
      <Tabs tabs={TABS} active={tab} base="/admin/data" />
      {tab === "catalog" && <Catalog />}
      {tab === "exports" && <Exports />}
      {tab === "partners" && <Partners owner={atLeast(me.role, "owner")} />}
      {tab === "usage" && <Usage />}
      {tab === "docs" && <Docs />}
    </div>
  );
}

/** An ISO time n days before this request (server-rendered). */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const fmt = (type: string, v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (type === "money_cents") return usd(Number(v));
  if (type === "ratio") return String(v);
  if (type === "timestamp") return when(String(v));
  if (type === "uuid") return String(v).slice(0, 8);
  return String(v);
};

async function Catalog() {
  const admin = db();
  const { data: s } = await admin.from("platform_settings").select("data_min_group").eq("id", true).maybeSingle();
  const results = await Promise.all(DATASETS.map(async (d) => ({ d, rows: await d.run(admin, { limit: 500 }).catch(() => [] as Record<string, unknown>[]) })));
  return (
    <>
      <p className="mb-4 text-[13px] text-muted">
        Every dataset leaves out any group smaller than <span className="text-foreground">{s?.data_min_group ?? 5} people</span>, and none contains names, usernames, wallets or messages. Rows appear here as Rivaly grows past that threshold per match or team.
      </p>
      <div className="flex flex-col gap-6">
        {results.map(({ d, rows }) => (
          <div key={d.id} className="rounded-xl bg-surface p-4 ring-1 ring-border">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-[15px] font-semibold text-foreground">
                  {d.title} <span className="ml-1 font-mono text-[11px] text-muted">{d.id}</span>
                </p>
                <p className="mt-1 text-[13px] text-muted">{d.summary}</p>
                <p className="mt-1 text-[12px] text-muted">
                  Buyers: <span className="text-foreground">{d.buyers}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold text-foreground">{num(rows.length)}</p>
                <p className="text-[11px] text-muted">rows available now</p>
                <a href={`/admin/export/dataset-${d.id}`} className="mt-1 inline-block text-[12px] text-muted underline">
                  Download CSV
                </a>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[12px] text-muted">Columns & preview</summary>
              <div className="mt-2 grid gap-1 text-[12px] sm:grid-cols-2">
                {d.columns.map((c) => (
                  <p key={c.name}>
                    <span className="font-mono text-foreground">{c.name}</span> <span className="text-muted">· {c.type} · {c.description}</span>
                  </p>
                ))}
              </div>
              {rows.length > 0 && (
                <div className="mt-3">
                  <DataTable columns={d.columns.slice(0, 8).map((c) => ({ label: c.name, cell: (r: Record<string, unknown>) => fmt(c.type, r[c.name]) })) as Column<Record<string, unknown>>[]} rows={rows.slice(0, 10)} />
                </div>
              )}
            </details>
          </div>
        ))}
      </div>
    </>
  );
}

function Exports() {
  const internal = [
    ["users", "Users", "Everyone, with rooms, stakes, winnings, losses, host fees, status and risk"],
    ["rooms", "Rooms", "Every room with its state, match, pot, sides and fees"],
    ["stakes", "Stakes", "Every stake in the date range, with results and Solana receipts"],
    ["transactions", "Transactions", "Every money event in the date range (stakes, payouts, refunds, deposits, withdrawals, fees, claims)"],
    ["events", "Platform events", "The full structured event log in the date range"],
    ["analytics", "Product analytics", "Raw page views and product actions in the date range (anonymous ids only)"],
    ["daily", "Daily metrics", "90 days of signups, active users, rooms, stakes, volume, fees, social"],
    ["acquisition", "Acquisition", "Signups by first-touch source, with wallet and staking conversion"],
  ];
  return (
    <>
      <p className="mb-4 text-[12px] text-muted">
        Date-ranged exports cover the last 30 days unless you add <span className="font-mono">?from=YYYY-MM-DD&amp;to=YYYY-MM-DD</span> to the link.
      </p>
      <div className="rounded-xl bg-surface ring-1 ring-border">
        {internal.map(([id, title, body]) => (
          <div key={id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
            <div>
              <p className="text-[14px] text-foreground">{title}</p>
              <p className="text-[12px] text-muted">{body}</p>
            </div>
            <a href={`/admin/export/${id}`} className="h-8 rounded-md bg-foreground px-3 pt-1.5 text-[12px] font-semibold text-background">
              Download CSV
            </a>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted">Internal exports contain personal data (user ids, wallets) — for Rivaly&apos;s own use only, never for partners. Every export is recorded in the audit log.</p>
    </>
  );
}

async function Partners({ owner }: { owner: boolean }) {
  const admin = db();
  const [{ data: partners }, { data: keys }, { data: usage }, { data: s }] = await Promise.all([
    admin.from("data_partners").select("*").order("created_at", { ascending: false }),
    admin.from("data_api_keys").select("id, partner_id, prefix, created_at, last_used_at, revoked_at").order("created_at", { ascending: false }),
    admin.from("data_api_usage").select("partner_id, rows, status").gt("at", daysAgo(30)).limit(50_000),
    admin.from("platform_settings").select("data_min_group").eq("id", true).maybeSingle(),
  ]);
  type P = { id: string; name: string; contact: string | null; datasets: string[]; rate_per_min: number; active: boolean; created_at: string };
  type K = { id: string; partner_id: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
  const options = DATASETS.map((d) => ({ id: d.id, title: d.title }));
  const use = (id: string) => ((usage ?? []) as { partner_id: string; rows: number; status: number }[]).filter((u) => u.partner_id === id);
  return (
    <>
      {owner && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <Section title="New partner">
            <PartnerForm options={options} action={createPartner} />
          </Section>
          <Section title="Privacy threshold">
            <MinGroupForm initial={s?.data_min_group ?? 5} action={setDataMinGroup} />
          </Section>
        </div>
      )}
      {((partners ?? []) as P[]).length === 0 && <p className="rounded-xl bg-surface px-4 py-10 text-center text-[13px] text-muted ring-1 ring-border">No partners yet.</p>}
      <div className="flex flex-col gap-4">
        {((partners ?? []) as P[]).map((p) => {
          const u = use(p.id);
          const mine = ((keys ?? []) as K[]).filter((k) => k.partner_id === p.id);
          return (
            <div key={p.id} className="rounded-xl bg-surface p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[15px] font-semibold text-foreground">
                  {p.name} <StatePill state={p.active ? "ok" : "cancelled"} label={p.active ? "active" : "paused"} />
                </p>
                <p className="text-[12px] text-muted">
                  {p.contact ?? "no contact"} · since {when(p.created_at)} · 30d: {num(u.length)} calls, {num(u.reduce((s, x) => s + x.rows, 0))} rows
                </p>
              </div>
              {owner ? (
                <div className="mt-3">
                  <PartnerEdit options={options} initial={{ datasets: p.datasets, ratePerMin: p.rate_per_min, active: p.active }} action={updatePartner.bind(null, p.id)} />
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-muted">Licensed: {p.datasets.join(", ") || "nothing yet"} · {p.rate_per_min}/min</p>
              )}
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-[12px] text-muted">API keys</p>
                {mine.map((k) => (
                  <p key={k.id} className="text-[12px]" style={{ opacity: k.revoked_at ? 0.5 : 1 }}>
                    <span className="font-mono text-foreground">{k.prefix}…</span> <span className="text-muted">· issued {when(k.created_at)} · last used {when(k.last_used_at)}</span>
                    {k.revoked_at ? <span className="text-muted"> · revoked</span> : owner ? <> · <SmallAction label="revoke" action={revokeKey.bind(null, k.id)} /></> : null}
                  </p>
                ))}
                {owner && (
                  <div className="mt-2">
                    <IssueKeyButton action={issueKey.bind(null, p.id)} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

async function Usage() {
  const since = daysAgo(30);
  const [{ data: rows }, { data: partners }] = await Promise.all([
    db().from("data_api_usage").select("partner_id, dataset, rows, status, at").gt("at", since).order("at", { ascending: false }).limit(50_000),
    db().from("data_partners").select("id, name"),
  ]);
  type U = { partner_id: string | null; dataset: string; rows: number; status: number; at: string };
  const us = (rows ?? []) as U[];
  const names = new Map(((partners ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const byKey = new Map<string, { partner: string; dataset: string; calls: number; rows: number; errors: number }>();
  for (const u of us) {
    const k = `${u.partner_id}:${u.dataset}`;
    const e = byKey.get(k) ?? { partner: names.get(u.partner_id ?? "") ?? "—", dataset: u.dataset, calls: 0, rows: 0, errors: 0 };
    e.calls++;
    e.rows += u.rows;
    if (u.status >= 400) e.errors++;
    byKey.set(k, e);
  }
  const summary = [...byKey.values()].sort((a, b) => b.calls - a.calls);
  return (
    <>
      <KpiGrid>
        <Kpi label="API calls (30d)" value={num(us.length)} />
        <Kpi label="Rows served (30d)" value={num(us.reduce((s, u) => s + u.rows, 0))} />
        <Kpi label="Errors / refusals" value={num(us.filter((u) => u.status >= 400).length)} tone={us.some((u) => u.status >= 500) ? "bad" : "neutral"} />
        <Kpi label="Rate-limited" value={num(us.filter((u) => u.status === 429).length)} />
        <Kpi label="Active partners" value={num(new Set(us.map((u) => u.partner_id)).size)} />
      </KpiGrid>
      <Section title="By partner and dataset (the billing basis)">
        <DataTable
          columns={[
            { label: "Partner", cell: (r: (typeof summary)[number]) => r.partner },
            { label: "Dataset", cell: (r: (typeof summary)[number]) => <span className="font-mono text-[12px]">{r.dataset}</span> },
            { label: "Calls", cell: (r: (typeof summary)[number]) => num(r.calls), align: "right" },
            { label: "Rows", cell: (r: (typeof summary)[number]) => num(r.rows), align: "right" },
            { label: "Errors", cell: (r: (typeof summary)[number]) => num(r.errors), align: "right" },
          ] as Column<(typeof summary)[number]>[]}
          rows={summary}
          empty="No API calls yet."
        />
      </Section>
    </>
  );
}

function Docs() {
  const example = `curl -H "Authorization: Bearer rvl_live_…" \\
  "https://<your-domain>/api/data/v1/match_sentiment?competition=Premier%20League&from=2026-10-01&to=2026-10-31"`;
  return (
    <div className="max-w-3xl text-[13px] leading-relaxed text-muted">
      <p className="text-foreground">Hand this to a partner along with their key.</p>
      <Section title="Authentication">
        <p>Every request sends <span className="font-mono text-foreground">Authorization: Bearer rvl_live_…</span>. Keys are issued per partner in Partners &amp; keys, shown once, and can be revoked instantly.</p>
      </Section>
      <Section title="Endpoints">
        <p>
          <span className="font-mono text-foreground">GET /api/data/v1</span> — your catalog: the datasets your licence covers, their columns and parameters.
          <br />
          <span className="font-mono text-foreground">GET /api/data/v1/{"{dataset}"}</span> — the rows. Parameters: <span className="font-mono">competition, from, to, match_id, limit</span> (as listed per dataset), <span className="font-mono">format=json|csv</span>.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-3 font-mono text-[12px] text-foreground">{example}</pre>
      </Section>
      <Section title="Response">
        <p>
          JSON: <span className="font-mono">{"{ dataset, generated_at, privacy: { aggregated: true, min_group_size }, columns, rows }"}</span>. Money is in USD cents; ratios are 0–1; times are UTC ISO-8601.
        </p>
      </Section>
      <Section title="Limits & errors">
        <p>401 bad key · 403 dataset not licensed or account paused · 404 unknown dataset · 429 over your per-minute limit (Retry-After: 60) · 500 try again.</p>
      </Section>
      <Section title="Privacy">
        <p>All data is aggregated. No row describes fewer than the configured minimum number of people; no names, usernames, wallets, emails or message text are ever included. Rivaly&apos;s privacy policy must describe this use before selling.</p>
      </Section>
      <p className="text-[12px]">Available datasets: {DATASETS.map((d) => d.id).join(", ")}.</p>
    </div>
  );
}
