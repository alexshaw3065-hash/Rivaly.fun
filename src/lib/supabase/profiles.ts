import { createClient } from "@/lib/supabase/server";
import { profileByUsername as mockProfileByUsername } from "@/lib/mock-data";
import { mapProfileRow, PROFILE_COLUMNS, type ProfileRow } from "@/lib/supabase/current-user";
import type { Profile } from "@/lib/types";

/**
 * Supabase-first, mock-fallback: a username on /profile/[username] can
 * belong to either a real signed-up user or one of the seeded mock
 * profiles (e.g. "victorj") that the rest of the app still renders from
 * mock-data.ts. Real usernames are constrained to [a-z0-9_]{3,20} by the
 * profiles table's own check constraint, so there's no ambiguity between
 * the two id spaces — we just try Supabase first since that's the
 * source of truth once a real account exists.
 */
export async function getProfileByUsername(username: string): Promise<Profile | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username)
    .maybeSingle();

  if (data) return mapProfileRow(data as ProfileRow);
  return mockProfileByUsername(username);
}
