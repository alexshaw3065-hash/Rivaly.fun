import { settleDueRooms } from "@/lib/settlement/settle";

// Settlement pass: rooms go live at kickoff, resolve (early, behind the
// 10-minute safety window, or at the whistle), and winners are paid from
// escrow. Idempotent — safe to call as often as a scheduler likes; the
// Render worker pings it every minute. Guarded by CRON_SECRET: it moves money.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await settleDueRooms();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
