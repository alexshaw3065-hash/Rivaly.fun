import { requireAdmin } from "@/lib/admin/guard";
import { db, rpc } from "@/lib/admin/data";
import { Bars, DataTable, Funnel, Kpi, KpiGrid, PageHeader, Section, Tabs, num, usd, type Column } from "@/components/admin/ui";

// Why things are happening: growth, activation, engagement and retention,
// rooms and predictions, revenue, the Arena, and the activation funnel.
// Time series come from admin_daily; cohorts from admin_retention; the
// funnel from admin_funnel — all in the database.

const TABS = [
  { id: "traffic", label: "Traffic & sources" },
  { id: "product", label: "Product funnels" },
  { id: "growth", label: "Acquisition & activation" },
  { id: "engagement", label: "Engagement & retention" },
  { id: "rooms", label: "Rooms & predictions" },
  { id: "revenue", label: "Revenue" },
  { id: "social", label: "Social / Arena" },
  { id: "funnels", label: "Funnels" },
];

type Day = { day: string; signups: number; active: number; rooms: number; stakes: number; volume_cents: number; fees_cents: number; posts: number; messages: number; reactions: number; follows: number; payouts_cents: number };
const short = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const series = (days: Day[], key: keyof Day) => days.map((d) => ({ label: short(d.day), value: Number(d[key]) }));
const sumOf = (days: Day[], key: keyof Day) => days.reduce((s, d) => s + Number(d[key]), 0);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ tab?: string; days?: string }> }) {
  await requireAdmin();
  const { tab = "growth", days: daysParam = "30" } = await searchParams;
  const range = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  const days = await rpc<Day[]>("admin_daily", { p_days: range });

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle={
          <>
            Last {range} days ·{" "}
            {[7, 30, 90].map((d) => (
              <a key={d} href={`/admin/analytics?tab=${tab}&days=${d}`} className={`mr-2 ${d === range ? "text-foreground" : "underline"}`}>
                {d}d
              </a>
            ))}
          </>
        }
      />
      <Tabs tabs={TABS} active={tab} base={`/admin/analytics?days=${range}`} />
      {tab === "traffic" && <Traffic range={range} />}
      {tab === "product" && <Product range={range} />}
      {tab === "growth" && <Growth days={days} />}
      {tab === "engagement" && <Engagement days={days} />}
      {tab === "rooms" && <Rooms days={days} />}
      {tab === "revenue" && <Revenue days={days} />}
      {tab === "social" && <Social days={days} />}
      {tab === "funnels" && <Funnels />}
    </div>
  );
}

function Chart({ title, data, format }: { title: string; data: { label: string; value: number }[]; format?: (v: number) => string }) {
  return (
    <div>
      <p className="mb-2 text-caption text-secondary">{title}</p>
      <Bars data={data} format={format} />
    </div>
  );
}

async function Growth({ days }: { days: Day[] }) {
  const f = await rpc<Record<string, number | null>>("admin_funnel");
  const signups = sumOf(days, "signups");
  return (
    <>
      <KpiGrid>
        <Kpi label="New users" value={num(signups)} />
        <Kpi label="Wallet ready" value={f.signed_up ? `${Math.round((Number(f.wallet) / Number(f.signed_up)) * 100)}%` : "—"} sub="of signups, last 90 days" />
        <Kpi label="Made a first stake" value={f.signed_up ? `${Math.round((Number(f.first_stake) / Number(f.signed_up)) * 100)}%` : "—"} sub="activation" />
        <Kpi label="Median time to first stake" value={f.median_hours_to_first_stake == null ? "—" : `${f.median_hours_to_first_stake}h`} />
        <Kpi label="Hosted a room" value={num(f.hosted_a_room)} />
        <Kpi label="Came back to stake again" value={num(f.second_stake)} />
      </KpiGrid>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Chart title="New users per day" data={series(days, "signups")} />
        <Chart title="Active users per day" data={series(days, "active")} />
      </div>
      <p className="mt-4 text-caption text-secondary">
        Acquisition source (where signups came from) isn&apos;t tracked yet — it needs referral/UTM capture at signup. Everything above is measured, not estimated.
      </p>
    </>
  );
}

async function Engagement({ days }: { days: Day[] }) {
  const [o, cohorts] = await Promise.all([rpc<Record<string, number>>("admin_overview"), rpc<{ cohort: string; size: number; week: number; retained: number }[]>("admin_retention", { p_weeks: 8 })]);
  const dau = o.active_today;
  const wau = o.active_7d;
  const mau = o.active_30d;
  const byCohort = new Map<string, { size: number; weeks: number[] }>();
  for (const c of cohorts) {
    const e = byCohort.get(c.cohort) ?? { size: c.size, weeks: [] };
    e.weeks[c.week] = c.retained;
    byCohort.set(c.cohort, e);
  }
  const maxWeeks = Math.max(0, ...[...byCohort.values()].map((c) => c.weeks.length));
  return (
    <>
      <KpiGrid>
        <Kpi label="Active today (DAU)" value={num(dau)} />
        <Kpi label="Active this week (WAU)" value={num(wau)} />
        <Kpi label="Active this month (MAU)" value={num(mau)} />
        <Kpi label="Stickiness (DAU/MAU)" value={mau ? `${Math.round((dau / mau) * 100)}%` : "—"} />
        <Kpi label="Stakes per active user" value={sumOf(days, "active") ? (sumOf(days, "stakes") / sumOf(days, "active")).toFixed(2) : "—"} sub="per active-day" />
        <Kpi label="Chat per active user" value={sumOf(days, "active") ? (sumOf(days, "messages") / sumOf(days, "active")).toFixed(2) : "—"} sub="messages per active-day" />
      </KpiGrid>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Chart title="Active users per day" data={series(days, "active")} />
        <Chart title="Stakes per day" data={series(days, "stakes")} />
      </div>
      <Section title="Weekly retention" hint="Of each signup week, the share active in each week after.">
        <div className="overflow-x-auto rounded-card bg-surface edge">
          <table className="w-full border-collapse text-caption">
            <thead>
              <tr className="border-b border-line text-left text-secondary">
                <th className="px-3 py-2">Signup week</th>
                <th className="px-3 py-2 text-right">People</th>
                {Array.from({ length: maxWeeks }, (_, w) => (
                  <th key={w} className="px-3 py-2 text-right">W{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...byCohort.entries()].map(([cohort, c]) => (
                <tr key={cohort} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{short(cohort)}</td>
                  <td className="px-3 py-2 text-right font-mono">{c.size}</td>
                  {Array.from({ length: maxWeeks }, (_, w) => {
                    const v = c.weeks[w];
                    const pct = v == null || !c.size ? null : Math.round((v / c.size) * 100);
                    return (
                      <td key={w} className="px-3 py-2 text-right font-mono" style={pct != null ? { background: `color-mix(in srgb, var(--yes) ${Math.min(pct, 100) * 0.5}%, transparent)` } : undefined}>
                        {pct == null ? "" : `${pct}%`}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {byCohort.size === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-secondary">
                    No signups in the last 8 weeks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

async function Rooms({ days }: { days: Day[] }) {
  const { data: rooms } = await db().from("rooms").select("id, prediction, market_type, visibility, participant_count, pool_total_cents, yes_total_cents, no_total_cents, status").limit(5000);
  type R = { id: string; prediction: string; market_type: string; visibility: string; participant_count: number; pool_total_cents: number; yes_total_cents: number; no_total_cents: number; status: string };
  const rs = (rooms ?? []) as R[];
  const staked = rs.filter((r) => r.participant_count > 0);
  const twoSided = staked.filter((r) => r.yes_total_cents > 0 && r.no_total_cents > 0).length;
  const markets = new Map<string, number>();
  for (const r of rs) markets.set(r.market_type ?? "custom", (markets.get(r.market_type ?? "custom") ?? 0) + 1);
  const { data: entries } = await db().from("entries").select("side, amount_cents").limit(20000);
  const es = (entries ?? []) as { side: string; amount_cents: number }[];
  const buckets: [string, number, number][] = [["under $5", 0, 500], ["$5–$20", 500, 2000], ["$20–$50", 2000, 5000], ["$50–$200", 5000, 20000], ["$200+", 20000, Infinity]];
  const top = [...rs].sort((a, b) => b.pool_total_cents - a.pool_total_cents).slice(0, 10);
  return (
    <>
      <KpiGrid>
        <Kpi label="Rooms (period)" value={num(sumOf(days, "rooms"))} />
        <Kpi label="Two-sided rooms" value={staked.length ? `${Math.round((twoSided / staked.length) * 100)}%` : "—"} sub="someone on each side — the core loop working" />
        <Kpi label="Avg people per room" value={staked.length ? (staked.reduce((s, r) => s + r.participant_count, 0) / staked.length).toFixed(1) : "—"} />
        <Kpi label="Public · private" value={`${rs.filter((r) => r.visibility === "public").length} · ${rs.filter((r) => r.visibility === "private").length}`} />
        <Kpi label="Stakes (period)" value={num(sumOf(days, "stakes"))} sub={usd(sumOf(days, "volume_cents"))} />
        <Kpi label="YES · NO stakes" value={`${es.filter((e) => e.side === "yes").length} · ${es.filter((e) => e.side === "no").length}`} />
      </KpiGrid>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Chart title="Rooms created per day" data={series(days, "rooms")} />
        <Chart title="Volume staked per day" data={series(days, "volume_cents")} format={(v) => usd(v)} />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Section title="Market mix">
          <Funnel steps={[...markets.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: label.replaceAll("_", " "), value }))} />
        </Section>
        <Section title="Stake sizes">
          <Funnel steps={buckets.map(([label, lo, hi]) => ({ label, value: es.filter((e) => e.amount_cents >= lo && e.amount_cents < hi).length }))} />
        </Section>
      </div>
      <Section title="Biggest rooms">
        <DataTable
          columns={[
            { label: "Room", cell: (r: R) => r.prediction },
            { label: "People", cell: (r: R) => num(r.participant_count), align: "right" },
            { label: "Pot", cell: (r: R) => usd(r.pool_total_cents), align: "right" },
            { label: "Status", cell: (r: R) => r.status },
          ] as Column<R>[]}
          rows={top}
          rowHref={(r) => `/admin/rooms/${r.id}`}
        />
      </Section>
    </>
  );
}

async function Revenue({ days }: { days: Day[] }) {
  const o = await rpc<Record<string, number>>("admin_overview");
  const volume = sumOf(days, "volume_cents");
  const fees = sumOf(days, "fees_cents");
  return (
    <>
      <KpiGrid>
        <Kpi label="Fees (period)" value={usd(fees)} />
        <Kpi label="Take rate" value={volume ? `${((fees / volume) * 100).toFixed(2)}%` : "—"} sub="fees ÷ volume staked" />
        <Kpi label="Rivaly share (all time)" value={usd(o.fees_rivaly)} />
        <Kpi label="Host share (all time)" value={usd(o.fees_host)} />
        <Kpi label="Volume (period)" value={usd(volume, { compact: true })} />
        <Kpi label="Paid to winners (period)" value={usd(sumOf(days, "payouts_cents"), { compact: true })} />
      </KpiGrid>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Chart title="Fees per day" data={series(days, "fees_cents")} format={(v) => usd(v)} />
        <Chart title="Paid to winners per day" data={series(days, "payouts_cents")} format={(v) => usd(v)} />
      </div>
      <p className="mt-4 text-caption text-secondary">Revenue is only ever a share of winners&apos; profit — Rivaly never takes the other side of a stake.</p>
    </>
  );
}

async function Social({ days }: { days: Day[] }) {
  return (
    <>
      <KpiGrid>
        <Kpi label="Arena posts" value={num(sumOf(days, "posts"))} />
        <Kpi label="Chat messages" value={num(sumOf(days, "messages"))} />
        <Kpi label="Reactions" value={num(sumOf(days, "reactions"))} />
        <Kpi label="Follows" value={num(sumOf(days, "follows"))} />
        <Kpi label="Messages per room" value={sumOf(days, "rooms") ? (sumOf(days, "messages") / sumOf(days, "rooms")).toFixed(1) : "—"} />
        <Kpi label="Posts per active user" value={sumOf(days, "active") ? (sumOf(days, "posts") / sumOf(days, "active")).toFixed(2) : "—"} />
      </KpiGrid>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Chart title="Arena posts per day" data={series(days, "posts")} />
        <Chart title="Chat messages per day" data={series(days, "messages")} />
        <Chart title="Reactions per day" data={series(days, "reactions")} />
        <Chart title="Follows per day" data={series(days, "follows")} />
      </div>
    </>
  );
}

async function Funnels() {
  const f = await rpc<Record<string, number | null>>("admin_funnel");
  return (
    <>
      <Section title="Activation funnel · signups in the last 90 days">
        <Funnel
          steps={[
            { label: "Signed up", value: Number(f.signed_up ?? 0) },
            { label: "Wallet ready", value: Number(f.wallet ?? 0) },
            { label: "First stake", value: Number(f.first_stake ?? 0) },
            { label: "Joined someone else's room", value: Number(f.joined_someone_elses_room ?? 0) },
            { label: "Staked again", value: Number(f.second_stake ?? 0) },
          ]}
        />
      </Section>
      <Section title="Creator & social funnel">
        <Funnel
          steps={[
            { label: "Signed up", value: Number(f.signed_up ?? 0) },
            { label: "Hosted a room", value: Number(f.hosted_a_room ?? 0) },
            { label: "Posted in the Arena", value: Number(f.posted_in_arena ?? 0) },
          ]}
        />
      </Section>
    </>
  );
}

// ── Traffic & product (first-party tracking: analytics_events) ────────

type Top = { label: string; visitors: number; total: number };

function TopList({ title, rows, unit = "views" }: { title: string; rows: Top[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="rounded-card bg-surface p-4 edge">
      <p className="mb-2 text-caption font-semibold uppercase text-secondary">{title}</p>
      {rows.length === 0 && <p className="py-4 text-caption text-secondary">No data yet.</p>}
      {rows.map((r) => (
        <div key={r.label} className="relative mb-1 flex items-center justify-between overflow-hidden rounded px-2 py-1 text-caption">
          <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(r.total / max) * 100}%`, background: "color-mix(in srgb, var(--yes) 14%, transparent)" }} aria-hidden />
          <span className="relative truncate text-foreground">{r.label}</span>
          <span className="relative shrink-0 font-mono text-secondary">
            {num(r.visitors)} visitors · {num(r.total)} {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

type Acq = { source: string; signups: number; wallets: number; stakers: number; volume_cents: number };
type Ref = { referrer_id: string | null; referrer_username: string; signups: number; wallets: number; stakers: number; volume_cents: number };

async function Traffic({ range }: { range: number }) {
  const [t, daily, paths, refs, sources, campaigns, countries, devices, acq] = await Promise.all([
    rpc<Record<string, number>>("admin_traffic", { p_days: range }),
    rpc<{ day: string; visitors: number; sessions: number; pageviews: number }[]>("admin_traffic_daily", { p_days: range }),
    rpc<Top[]>("admin_top", { p_dim: "path", p_days: range, p_limit: 15 }),
    rpc<Top[]>("admin_top", { p_dim: "referrer", p_days: range, p_limit: 10 }),
    rpc<Top[]>("admin_top", { p_dim: "utm_source", p_days: range, p_limit: 10 }),
    rpc<Top[]>("admin_top", { p_dim: "utm_campaign", p_days: range, p_limit: 10 }),
    rpc<Top[]>("admin_top", { p_dim: "country", p_days: range, p_limit: 10 }),
    rpc<Top[]>("admin_top", { p_dim: "device", p_days: range, p_limit: 5 }),
    rpc<Acq[]>("admin_acquisition", { p_days: Math.max(range, 30) }),
  ]);
  const referrers = await rpc<Ref[]>("admin_referrals", { p_days: Math.max(range, 30) });
  const mins = Math.floor((t.avg_session_seconds ?? 0) / 60);
  const secs = (t.avg_session_seconds ?? 0) % 60;
  return (
    <>
      <KpiGrid>
        <Kpi label="Visitors" value={num(t.visitors)} sub={`${num(t.signed_in_visitors)} signed in`} />
        <Kpi label="Sessions" value={num(t.sessions)} />
        <Kpi label="Page views" value={num(t.pageviews)} sub={`${t.pages_per_session} per session`} />
        <Kpi label="Avg session" value={`${mins}m ${secs}s`} />
        <Kpi label="Bounce rate" value={`${t.bounce_rate}%`} sub="sessions with a single event" />
        <Kpi label="Tracked actions" value={num(t.events)} />
      </KpiGrid>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Chart title="Visitors per day" data={daily.map((d) => ({ label: short(d.day), value: d.visitors }))} />
        <Chart title="Page views per day" data={daily.map((d) => ({ label: short(d.day), value: d.pageviews }))} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <TopList title="Top pages" rows={paths} />
        <TopList title="Referring sites" rows={refs} unit="events" />
        <TopList title="Sources (utm_source / ?ref=)" rows={sources} unit="events" />
        <TopList title="Campaigns" rows={campaigns} unit="events" />
        <TopList title="Countries" rows={countries} unit="events" />
        <TopList title="Devices" rows={devices} unit="events" />
      </div>
      <Section title="Which channels bring people who stake">
        <DataTable
          columns={
            [
              { label: "First-touch source", cell: (r: Acq) => r.source },
              { label: "Signups", cell: (r: Acq) => num(r.signups), align: "right" },
              { label: "Wallet ready", cell: (r: Acq) => num(r.wallets), align: "right" },
              { label: "Staked", cell: (r: Acq) => num(r.stakers), align: "right" },
              { label: "Signup → stake", cell: (r: Acq) => (r.signups ? `${Math.round((r.stakers / r.signups) * 100)}%` : "—"), align: "right" },
              { label: "Volume", cell: (r: Acq) => usd(r.volume_cents), align: "right" },
            ] as Column<Acq>[]
          }
          rows={acq}
        />
        <p className="mt-2 text-caption text-secondary">
          Tag links with ?utm_source=…&amp;utm_campaign=… (or ?ref=…) and every signup from them is attributed here. Accounts made before tracking began show as “before tracking”.
        </p>
      </Section>
      <Section title="Top referrers" hint="Every link a signed-in person shares carries ?ref=their username.">
        <DataTable
          columns={
            [
              { label: "Referrer", cell: (r: Ref) => (r.referrer_id ? <a href={`/admin/users/${r.referrer_id}`} className="underline">@{r.referrer_username}</a> : `@${r.referrer_username}`) },
              { label: "Signups", cell: (r: Ref) => num(r.signups), align: "right" },
              { label: "Wallet ready", cell: (r: Ref) => num(r.wallets), align: "right" },
              { label: "Staked", cell: (r: Ref) => num(r.stakers), align: "right" },
              { label: "Their volume", cell: (r: Ref) => usd(r.volume_cents), align: "right" },
            ] as Column<Ref>[]
          }
          rows={referrers}
          empty="No referred signups yet."
        />
      </Section>
    </>
  );
}

const FUNNELS: { title: string; steps: string[]; labels: string[] }[] = [
  { title: "Visit → stake", steps: ["page_view", "stake_panel_opened", "stake_submitted"], labels: ["Visited", "Opened the stake panel", "Staked"] },
  { title: "Visit → room created", steps: ["page_view", "room_create_step", "room_created"], labels: ["Visited", "Started creating a room", "Created a room"] },
  { title: "Sign-in prompt → stake", steps: ["auth_modal_opened", "stake_panel_opened", "stake_submitted"], labels: ["Saw sign-in", "Opened the stake panel", "Staked"] },
  { title: "Arena", steps: ["page_view", "arena_composer_opened", "arena_post_submitted"], labels: ["Visited", "Opened the composer", "Posted"] },
];

async function Product({ range }: { range: number }) {
  const [funnels, events] = await Promise.all([
    Promise.all(FUNNELS.map((f) => rpc<{ step: number; event: string; visitors: number }[]>("admin_event_funnel", { p_steps: f.steps, p_days: range }))),
    rpc<Top[]>("admin_top", { p_dim: "event", p_days: range, p_limit: 30 }),
  ]);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {FUNNELS.map((f, i) => (
          <Section key={f.title} title={f.title}>
            <Funnel steps={funnels[i].map((s, j) => ({ label: f.labels[j] ?? s.event, value: s.visitors }))} />
          </Section>
        ))}
      </div>
      <Section title="Every tracked action" hint="Funnels count visitors in order: each step only counts people who did the previous one first.">
        <TopList title="Actions" rows={events} unit="times" />
      </Section>
    </>
  );
}
