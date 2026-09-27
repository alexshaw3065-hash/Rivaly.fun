import { createAdminClient } from "@/lib/supabase/admin";

// Every scheduled job run, recorded for /admin → System → Jobs: when it ran,
// how long it took, whether it worked, and a short summary of what it did.
// A failure is also logged as a SYSTEM_ERROR event. Recording is
// best-effort: a logging problem never breaks the job itself.

const KEEP_DAYS = 14;

function summarize(value: unknown): Record<string, unknown> {
  try {
    const json = JSON.parse(JSON.stringify(value ?? {}));
    const text = JSON.stringify(json);
    return text.length > 2000 ? { truncated: text.slice(0, 2000) } : (json as Record<string, unknown>);
  } catch {
    return {};
  }
}

export async function recordJob<T>(job: string, run: () => Promise<T>): Promise<T> {
  const admin = createAdminClient();
  const started = Date.now();
  const { data: row } = await admin.from("job_runs").insert({ job }).select("id").maybeSingle().then(
    (r) => r,
    () => ({ data: null }),
  );
  const finish = (ok: boolean, detail: Record<string, unknown>) =>
    row?.id
      ? admin
          .from("job_runs")
          .update({ finished_at: new Date().toISOString(), ok, detail: { ...detail, ms: Date.now() - started } })
          .eq("id", row.id)
          .then(() => undefined, () => undefined)
      : Promise.resolve();

  // Now and then, drop runs older than two weeks.
  if (Math.random() < 0.01) {
    void admin.from("job_runs").delete().lt("started_at", new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString()).then(() => undefined, () => undefined);
  }

  try {
    const result = await run();
    await finish(true, summarize(result));
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await finish(false, { error: message.slice(0, 500) });
    await admin
      .from("platform_events")
      .insert({ type: "SYSTEM_ERROR", source: "system", status: "failed", metadata: { job, error: message.slice(0, 500) } })
      .then(() => undefined, () => undefined);
    throw e;
  }
}
