import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The ONLY file in this codebase that touches SUPABASE_SERVICE_ROLE_KEY.
// Every other table/query in this app goes through RLS via the anon key —
// that's been a deliberate, hard-held line since the very first migration.
// This is the one intentional exception: the Dynamic login bridge
// (src/app/auth/dynamic-actions.ts) needs to create/look up auth.users
// rows before a real Supabase session exists to authenticate as. Never
// import this from anywhere else, and never let it anywhere near a client
// component — it bypasses every RLS policy in the database.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin client is not configured.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
