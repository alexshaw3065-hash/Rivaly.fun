import { createAdminClient } from "@/lib/supabase/admin";
import { syncFixturesWith, type SyncFixturesResult } from "./sync-fixtures-core";

export type { SyncFixturesResult };

/** The app's entry point (/api/cron/sync-fixtures); the worker calls syncFixturesWith directly. */
export function syncFixtures(): Promise<SyncFixturesResult> {
  return syncFixturesWith(createAdminClient());
}
