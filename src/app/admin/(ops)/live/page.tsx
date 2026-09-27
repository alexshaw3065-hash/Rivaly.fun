import { requireAdmin } from "@/lib/admin/guard";
import { eventContext, loadEvents } from "@/lib/admin/data";
import { describeEvent } from "@/lib/admin/events";
import { PageHeader } from "@/components/admin/ui";
import { LiveStream } from "@/components/admin/live-stream";

// Every structured event on the platform as it happens, filterable by kind.
export default async function LiveActivity() {
  await requireAdmin();
  const events = await loadEvents({ limit: 150 });
  const ctx = await eventContext(events);
  return (
    <div>
      <PageHeader title="Live activity" subtitle="Every signup, stake, result, payout, report and admin action — as it happens." />
      <LiveStream initial={events.map((e) => ({ id: e.id, at: e.at, type: e.type, status: e.status, ...describeEvent(e, ctx) }))} limit={150} filterable />
    </div>
  );
}
