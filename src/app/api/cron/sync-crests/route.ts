import { revalidateTag } from "next/cache";
import { syncCrests } from "@/lib/crests/sync";
import { recordJob } from "@/lib/admin/jobs";
import { submitRecentPages } from "@/lib/indexnow";
import { cronAuthorized } from "@/lib/cron-auth";

// Real team/league badges for any team that doesn't have one yet (new
// fixtures, retries of last week's misses). The Render worker pings this
// hourly; each pass works for up to ~50s and the next one continues.
// The same hourly ping also tells search engines about the hour's new public
// rooms and profiles (IndexNow) — recorded as its own job, and a failure
// there never fails the crest sync.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (!cronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await recordJob("sync_crests", () => syncCrests());
    // New badges show on the next page load, not after the map's 10-minute cache.
    if (result.added > 0) revalidateTag("crests", "max");
    const indexnow = await recordJob("indexnow", () => submitRecentPages()).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
    return Response.json({ ok: true, ...result, indexnow });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
