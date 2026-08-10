import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The waitlist lives in its OWN Supabase project, separate from the main-site
 * database, so the landing page can ship and collect emails before the real
 * product schema exists. Uses WAITLIST_* env vars — do not reuse the main
 * NEXT_PUBLIC_SUPABASE_* vars here. Writes happen server-side only (API route),
 * so this uses the service role key and is never imported into client code.
 */
export const WAITLIST_TABLE = "waitlist_signups";

export function isWaitlistConfigured() {
  return Boolean(
    process.env.WAITLIST_SUPABASE_URL &&
      process.env.WAITLIST_SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getWaitlistClient(): SupabaseClient | null {
  if (!isWaitlistConfigured()) return null;

  return createClient(
    process.env.WAITLIST_SUPABASE_URL!,
    process.env.WAITLIST_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Server-only. Returns null when the waitlist project isn't connected yet. */
export async function getWaitlistCount(): Promise<number | null> {
  const supabase = getWaitlistClient();
  if (!supabase) return null;

  const { count, error } = await supabase
    .from(WAITLIST_TABLE)
    .select("*", { count: "exact", head: true });

  if (error) return null;
  return count ?? null;
}
