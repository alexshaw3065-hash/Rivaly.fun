import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The ONLY file in this codebase that touches SUPABASE_SERVICE_ROLE_KEY.
// Every other table/query in this app goes through RLS via the anon key —
// that's been a deliberate, hard-held line since the very first migration.
//
// There are exactly three intentional exceptions:
//
//   1. The Dynamic login bridge (src/app/auth/dynamic-actions.ts) has to
//      create/look up auth.users rows before a session exists at all.
//   2. The TxLINE ingester (src/lib/txline/*) writes matches and
//      match_events, which deliberately have no insert policies — clients
//      must never be able to invent a fixture or a score once rooms hold
//      money, so those tables are read-only to every client and written
//      only by server-side sync jobs.
//   3. The escrow money path (src/app/rooms/actions.ts, src/lib/settlement)
//      writes stake intents, entries and payouts. An entry may only exist
//      after the server has verified its USDC transfer into escrow
//      on-chain, so clients can't write entries at all; the verified user
//      id comes from their session, never from the request body.
//   4. The chat photo clean-up (src/app/api/cron/expire-photos) marks
//      60-day-old photo messages expired after deleting their files from
//      Cloudinary. Messages have no update policy for clients.
//
// Never import this from anywhere else, and never let it anywhere near a
// client component — it bypasses every RLS policy in the database.
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
