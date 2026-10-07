import { settleDueRooms } from "@/lib/settlement/settle";
import { recordJob } from "@/lib/admin/jobs";
import { runSignupGrants } from "@/lib/grants/signup";
import { cronAuthorized } from "@/lib/cron-auth";

// Settlement pass: rooms go live at kickoff, resolve (early, behind the
// 10-minute safety window, or at the whistle), and winners are paid from
// escrow. Idempotent — safe to call as often as a scheduler likes; the
// Render worker pings it every minute. Guarded by CRON_SECRET: it moves money.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (!cronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await recordJob("settle", () => settleDueRooms());
    // Sign-up grants ride the same minute tick — separate job, and its
    // failure never touches settlement's result.
    const grants = await recordJob("signup_grants", () => runSignupGrants()).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
    return Response.json({ ok: true, ...result, grants });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
