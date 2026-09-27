import { createAdminClient } from "@/lib/supabase/admin";
import { DATASETS } from "@/lib/data/datasets";
import { bearer, hashApiKey } from "@/lib/data/format";

// Rivaly Data catalog for the calling partner: which datasets their key can
// read, with column definitions and parameters.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = bearer(request.headers.get("authorization"));
  if (!key) return Response.json({ error: "Missing or malformed API key." }, { status: 401 });
  const { data: k } = await createAdminClient()
    .from("data_api_keys")
    .select("revoked_at, partner:data_partners(name, active, datasets, rate_per_min)")
    .eq("key_hash", hashApiKey(key))
    .maybeSingle();
  const partner = k?.partner as unknown as { name: string; active: boolean; datasets: string[]; rate_per_min: number } | null;
  if (!k || k.revoked_at || !partner) return Response.json({ error: "Invalid or revoked API key." }, { status: 401 });
  return Response.json({
    partner: partner.name,
    active: partner.active,
    rate_per_min: partner.rate_per_min,
    datasets: DATASETS.filter((d) => partner.datasets.includes(d.id)).map((d) => ({
      id: d.id,
      title: d.title,
      summary: d.summary,
      endpoint: `/api/data/v1/${d.id}`,
      params: d.params,
      formats: ["json", "csv"],
      columns: d.columns,
    })),
  });
}
