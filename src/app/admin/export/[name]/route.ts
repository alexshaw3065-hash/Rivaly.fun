import { notFound } from "next/navigation";
import { getAdmin } from "@/lib/admin/guard";
import { recordAdminAction } from "@/lib/admin/audit";
import { db } from "@/lib/admin/data";
import { datasetById, paramsFrom } from "@/lib/data/datasets";
import { toCsv } from "@/lib/data/format";

// One-click CSV exports for admins: every Rivaly Data dataset (anonymised,
// exactly what partners get) plus the internal tables operators need.
// Admins only; every export is written to the audit log.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE = 1000;
const CAP = 50_000;

async function allRows(query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; from < CAP; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function rpcPaged(fn: string, args: Record<string, unknown>) {
  const out: Record<string, unknown>[] = [];
  for (let offset = 0; offset < CAP; offset += 200) {
    const { data, error } = await db().rpc(fn, { ...args, p_limit: 200, p_offset: offset });
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < 200) break;
  }
  for (const r of out) delete r.total_count;
  return out;
}

export async function GET(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const me = await getAdmin();
  if (!me) notFound();
  const { name } = await ctx.params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
  const to = url.searchParams.get("to") ?? new Date().toISOString();
  const admin = db();
  let rows: Record<string, unknown>[];
  let columns: string[] | undefined;

  const dataset = name.startsWith("dataset-") ? datasetById(name.slice(8)) : null;
  if (dataset) {
    rows = await dataset.run(admin, paramsFrom(url.searchParams));
    columns = dataset.columns.map((c) => c.name);
  } else {
    switch (name) {
      case "users":
        rows = await rpcPaged("admin_users", { p_filter: "all" });
        break;
      case "rooms":
        rows = await rpcPaged("admin_rooms", { p_state: "all" });
        break;
      case "stakes":
        rows = (await allRows((a, b) => admin.from("entries").select("id, created_at, room_id, user_id, side, amount_cents, is_winner, payout_cents, stake_tx_signature, payout_tx_signature").gte("created_at", from).lte("created_at", to).order("created_at").range(a, b))) as Record<string, unknown>[];
        break;
      case "events":
        rows = await allRows((a, b) => admin.from("platform_events").select("id, at, type, user_id, room_id, match_id, tx_signature, amount_cents, source, status, metadata").gte("at", from).lte("at", to).order("at").range(a, b));
        break;
      case "transactions":
        rows = await allRows((a, b) =>
          admin.from("platform_events").select("at, type, user_id, room_id, amount_cents, tx_signature, status").in("type", ["STAKE_PLACED", "PAYOUT_SENT", "REFUND_SENT", "DEPOSIT", "WITHDRAWAL", "CLAIM_COMPLETED", "FEE_EARNED", "STAKE_FAILED", "CLAIM_FAILED"]).gte("at", from).lte("at", to).order("at").range(a, b),
        );
        break;
      case "analytics":
        rows = await allRows((a, b) => admin.from("analytics_events").select("at, event, anon_id, session_id, user_id, path, referrer_host, utm_source, utm_medium, utm_campaign, device, country, props").gte("at", from).lte("at", to).order("at").range(a, b));
        break;
      case "daily":
        rows = ((await admin.rpc("admin_daily", { p_days: 90 })).data ?? []) as Record<string, unknown>[];
        break;
      case "acquisition":
        rows = ((await admin.rpc("admin_acquisition", { p_days: 365 })).data ?? []) as Record<string, unknown>[];
        break;
      default:
        notFound();
    }
  }

  await recordAdminAction({ adminId: me.userId, via: me.via, action: `export_${name}`, targetType: "setting", targetId: name, after: { rows: rows.length, from, to } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows, columns), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="rivaly-${name}-${stamp}.csv"`, "cache-control": "no-store" },
  });
}
