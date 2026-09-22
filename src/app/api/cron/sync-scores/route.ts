import { syncScores } from "@/lib/txline/sync-scores";

// The correctness backstop for match results. Runs frequently enough to keep
// finished matches accurate without needing the always-on SSE worker, and
// stays useful after that worker exists: the stream has no resume, so
// something has to repair whatever it missed while disconnected.
//
// Guarded by CRON_SECRET — writes with the service role.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Optional wider lookback for backfills and post-outage repair. Clamped
  // inside syncScores so a huge value can't fan out into thousands of calls.
  const pastHoursParam = new URL(request.url).searchParams.get("pastHours");
  const pastHours = pastHoursParam ? Number(pastHoursParam) : undefined;

  try {
    const result = await syncScores(
      Number.isFinite(pastHours) && pastHours !== undefined ? { pastHours } : {},
    );
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
