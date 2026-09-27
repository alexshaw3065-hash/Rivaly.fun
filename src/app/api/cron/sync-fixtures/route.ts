import { syncFixtures } from "@/lib/txline/sync-fixtures";
import { recordJob } from "@/lib/admin/jobs";

// Fixtures change slowly (kickoff times, postponements), so hourly is ample —
// which is why this is a scheduled route rather than part of the always-on
// scores worker. No persistent connection needed, so it costs no extra infra.
//
// Guarded by CRON_SECRET: this writes with the service role, so it must never
// be publicly invocable.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordJob("txline-fixtures", () => syncFixtures());
    // Per-competition errors are reported rather than thrown: one gated or
    // flaky competition shouldn't fail the whole run.
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
