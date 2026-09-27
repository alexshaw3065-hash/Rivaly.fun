import { createAdminClient } from "@/lib/supabase/admin";
import { recordJob } from "@/lib/admin/jobs";
import { syncFixtures } from "@/lib/bigballs/sync";

// Big Balls fixtures for UCL, La Liga, Bundesliga, Serie A, Ligue 1 and MLS
// (one call per league). The Render worker runs this itself every 6 hours
// and does the live polling; this route is the manual trigger and a
// backstop. Guarded by CRON_SECRET: it writes with the service role.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = process.env.BIGBALLS_API_KEY;
  if (!key) return Response.json({ error: "BIGBALLS_API_KEY is not configured" }, { status: 500 });
  try {
    const result = await recordJob("bigballs-fixtures", () => syncFixtures(createAdminClient(), key));
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
