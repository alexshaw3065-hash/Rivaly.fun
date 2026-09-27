import { createAdminClient } from "@/lib/supabase/admin";
import { datasetById, paramsFrom } from "@/lib/data/datasets";
import { bearer, hashApiKey, toCsv } from "@/lib/data/format";

// Rivaly Data partner API: GET /api/data/v1/{dataset}?competition=&from=&to=&match_id=&limit=&format=json|csv
// Authorization: Bearer rvl_live_… (a key issued in /admin → Data). Keys are
// looked up by hash; the partner must be active and licensed for the
// dataset; calls are rate-limited per partner per minute and every call is
// metered in data_api_usage (the basis for billing).

export const dynamic = "force-dynamic";

function problem(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request, ctx: { params: Promise<{ dataset: string }> }) {
  const { dataset: id } = await ctx.params;
  const key = bearer(request.headers.get("authorization"));
  if (!key) return problem(401, "Missing or malformed API key. Send Authorization: Bearer rvl_live_…");
  const admin = createAdminClient();

  const { data: k } = await admin.from("data_api_keys").select("id, partner_id, revoked_at, partner:data_partners(id, active, datasets, rate_per_min)").eq("key_hash", hashApiKey(key)).maybeSingle();
  const partner = k?.partner as unknown as { id: string; active: boolean; datasets: string[]; rate_per_min: number } | null;
  if (!k || k.revoked_at || !partner) return problem(401, "Invalid or revoked API key.");
  const meter = (status: number, rows = 0) => admin.from("data_api_usage").insert({ key_id: k.id, partner_id: partner.id, dataset: id.slice(0, 60), rows, status }).then(() => undefined, () => undefined);
  if (!partner.active) {
    await meter(403);
    return problem(403, "This partner account is paused.");
  }
  const dataset = datasetById(id);
  if (!dataset) {
    await meter(404);
    return problem(404, `Unknown dataset. See GET /api/data/v1 for your catalog.`);
  }
  if (!partner.datasets.includes(dataset.id)) {
    await meter(403);
    return problem(403, `Your licence doesn't include ${dataset.id}.`);
  }
  const { count } = await admin.from("data_api_usage").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).gt("at", new Date(Date.now() - 60_000).toISOString());
  if ((count ?? 0) >= partner.rate_per_min) {
    await meter(429);
    return new Response(JSON.stringify({ error: `Rate limit: ${partner.rate_per_min} requests per minute.` }), { status: 429, headers: { "content-type": "application/json", "retry-after": "60" } });
  }

  const url = new URL(request.url);
  let rows: Record<string, unknown>[];
  try {
    rows = await dataset.run(admin, paramsFrom(url.searchParams));
  } catch {
    await meter(500);
    return problem(500, "Couldn't build the dataset — try again.");
  }
  await Promise.all([meter(200, rows.length), admin.from("data_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id)]);
  const { data: settings } = await admin.from("platform_settings").select("data_min_group").eq("id", true).maybeSingle();

  if (url.searchParams.get("format") === "csv") {
    return new Response(toCsv(rows, dataset.columns.map((c) => c.name)), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="rivaly-${dataset.id}.csv"`, "cache-control": "no-store" },
    });
  }
  return Response.json(
    { dataset: dataset.id, generated_at: new Date().toISOString(), privacy: { aggregated: true, min_group_size: settings?.data_min_group ?? 5 }, columns: dataset.columns, rows },
    { headers: { "cache-control": "no-store" } },
  );
}
