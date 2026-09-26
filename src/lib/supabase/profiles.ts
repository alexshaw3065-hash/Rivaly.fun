import { createClient } from "@/lib/supabase/server";
import { mapProfileRow, PROFILE_COLUMNS, type ProfileRow } from "@/lib/supabase/current-user";
import type { Profile } from "@/lib/types";

// Real ids are UUIDs; every mock profile id is a short "u1"-style string.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A real profile by username (no sample-data fallback). */
export async function getProfileByUsername(username: string): Promise<Profile | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username)
    .maybeSingle();

  return data ? mapProfileRow(data as ProfileRow) : undefined;
}

/** Same idea as getProfileByUsername, keyed by id — e.g. a room's creator_id. */
export async function getProfileById(id: string): Promise<Profile | undefined> {
  if (!UUID_RE.test(id)) return undefined;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  return data ? mapProfileRow(data as ProfileRow) : undefined;
}

/**
 * Does the signed-in user already follow this profile? Only meaningful
 * between two real accounts — a mock target id can't exist in the real
 * follows table at all (its FK requires both sides to be real profiles
 * rows), so this returns false for any mock id without needing a query.
 */
export async function currentUserFollows(targetUserId: string): Promise<boolean> {
  if (!UUID_RE.test(targetUserId)) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  return data !== null;
}
