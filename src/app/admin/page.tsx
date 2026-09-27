import { requireAdmin } from "@/lib/admin/guard";
import { eventContext, loadEvents, rpc } from "@/lib/admin/data";
import { describeEvent } from "@/lib/admin/events";
import { Bars, Kpi, KpiGrid, PageHeader, Section, num, usd } from "@/components/admin/ui";
import { LiveStream } from "@/components/admin/live-stream";

// "What is happening on Rivaly right now?" — people, rooms, predictions,
// money, anything broken, and the live stream. Every number is computed in
// the database (admin_overview / admin_daily), not in this page.

type Overview = Record<string, number> & { rooms_by_state: Record<string, number> };
type Day = { day: string; signups: number; active: number; rooms: number; stakes: number; volume_cents: number; fees_cents: number };

const short = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function AdminDashboard() {
  await requireAdmin();
  const [o, days, events] = await Promise.all([rpc<Overview>("admin_overview"), rpc<Day[]>("admin_daily", { p_days: 30 }), loadEvents({ limit: 40 })]);
  const ctx = await eventContext(events);
  const initial = events.map((e) => ({ id: e.id, at: e.at, type: e.type, status: e.status, ...describeEvent(e, ctx) }));
  const s = o.rooms_by_state ?? {};
  const problems = o.stakes_failed_24h + o.settlement_failed_24h + o.claims_failed_24h + o.system_errors_24h + o.jobs_failed_24h + o.stale_live_matches + (s.stuck ?? 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={problems === 0 ? "Everything is working." : `${problems} thing${problems === 1 ? "" : "s"} need attention — see Operations below.`}
      />

      <Section title="People">
        <KpiGrid>
          <Kpi label="Total users" value={num(o.users_total)} sub={`${num(o.wallets)} with a wallet`} href="/admin/users" />
          <Kpi label="New today" value={num(o.users_today)} href="/admin/users?filter=new" />
          <Kpi label="Active today" value={num(o.active_today)} />
          <Kpi label="Active this week" value={num(o.active_7d)} />
          <Kpi label="Active this month" value={num(o.active_30d)} />
          <Kpi label="Open reports" value={num(o.open_reports)} tone={o.open_reports ? "warn" : "neutral"} href="/admin/moderation" />
        </KpiGrid>
      </Section>

      <Section title="Rooms">
        <KpiGrid>
          <Kpi label="Total rooms" value={num(o.rooms_total)} href="/admin/rooms" />
          <Kpi label="Created today" value={num(o.rooms_today)} />
          <Kpi label="Open for stakes" value={num(s.open)} href="/admin/rooms?state=open" />
          <Kpi label="Live" value={num(s.live)} tone={s.live ? "good" : "neutral"} href="/admin/rooms?state=live" />
          <Kpi label="Awaiting / settling" value={num((s.awaiting_result ?? 0) + (s.verifying ?? 0) + (s.settling ?? 0))} tone={(s.awaiting_result ?? 0) + (s.settling ?? 0) ? "warn" : "neutral"} href="/admin/rooms?state=pending" />
          <Kpi label="Settled · refunded" value={`${num(s.settled)} · ${num(s.refunded)}`} href="/admin/rooms?state=settled" />
        </KpiGrid>
      </Section>

      <Section title="Predictions">
        <KpiGrid>
          <Kpi label="Stakes placed" value={num(o.predictions_total)} sub={`${num(o.predictions_today)} today`} />
          <Kpi label="Volume staked" value={usd(o.volume_total, { compact: true })} sub={`${usd(o.volume_today)} today`} />
          <Kpi label="Average stake" value={usd(o.avg_stake)} />
          <Kpi label="Avg people per room" value={String(o.avg_participants)} />
          <Kpi label="Average pot" value={usd(o.avg_pool)} />
          <Kpi label="Paid to winners" value={usd(o.payout_volume, { compact: true })} sub={`${usd(o.refund_volume)} refunded`} />
        </KpiGrid>
      </Section>

      <Section title="Economics">
        <KpiGrid>
          <Kpi label="Fees earned (all)" value={usd(o.fees_total)} sub={`${usd(o.fees_today)} today`} href="/admin/finance?tab=fees" />
          <Kpi label="Rivaly's share" value={usd(o.fees_rivaly)} />
          <Kpi label="Hosts' share" value={usd(o.fees_host)} />
          <Kpi label="Total volume" value={usd(o.volume_total, { compact: true })} />
          <Kpi label="Payout volume" value={usd(o.payout_volume, { compact: true })} />
          <Kpi label="Refund volume" value={usd(o.refund_volume, { compact: true })} />
        </KpiGrid>
      </Section>

      <Section title="Operations · last 24 hours">
        <KpiGrid>
          <Kpi label="Failed stakes" value={num(o.stakes_failed_24h)} tone={o.stakes_failed_24h ? "bad" : "good"} href="/admin/finance?tab=failed" />
          <Kpi label="Failed settlements" value={num(o.settlement_failed_24h)} tone={o.settlement_failed_24h ? "bad" : "good"} href="/admin/settlement?tab=failed" />
          <Kpi label="Stuck rooms" value={num(s.stuck)} tone={s.stuck ? "bad" : "good"} href="/admin/rooms?state=stuck" />
          <Kpi label="Stale live matches" value={num(o.stale_live_matches)} tone={o.stale_live_matches ? "bad" : "good"} href="/admin/matches?view=problems" />
          <Kpi label="Failed claims" value={num(o.claims_failed_24h)} tone={o.claims_failed_24h ? "bad" : "good"} href="/admin/finance?tab=failed" />
          <Kpi label="Job / system errors" value={num(o.jobs_failed_24h + o.system_errors_24h)} tone={o.jobs_failed_24h + o.system_errors_24h ? "bad" : "good"} href="/admin/system?tab=errors" />
        </KpiGrid>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[12px] text-muted">New users · 30 days</p>
            <Bars data={days.map((d) => ({ label: short(d.day), value: d.signups }))} />
          </div>
          <div>
            <p className="mb-2 text-[12px] text-muted">Active users · 30 days</p>
            <Bars data={days.map((d) => ({ label: short(d.day), value: d.active }))} format={(v) => `${num(v)} active-days`} />
          </div>
          <div>
            <p className="mb-2 text-[12px] text-muted">Volume staked · 30 days</p>
            <Bars data={days.map((d) => ({ label: short(d.day), value: d.volume_cents }))} format={(v) => usd(v)} />
          </div>
          <div>
            <p className="mb-2 text-[12px] text-muted">Rooms created · 30 days</p>
            <Bars data={days.map((d) => ({ label: short(d.day), value: d.rooms }))} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[12px] text-muted">Live platform</p>
          <LiveStream initial={initial} limit={40} compact />
        </div>
      </div>
    </div>
  );
}
