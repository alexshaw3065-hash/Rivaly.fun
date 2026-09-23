import { createClient } from "@/lib/supabase/server";
import { matchById as mockMatchById } from "@/lib/mock-data";
import { ROOM_UUID_RE } from "@/lib/supabase/room-mapper";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import type { Match } from "@/lib/types";

export { MATCH_COLUMNS };

// Same mock-first-check-then-real convention used everywhere else in this
// codebase (getProfileById, getRoomById) — real ids are UUIDs, every mock
// match id is a short "m1"-style string, so there's no ambiguity between
// the two id spaces. Needed because rooms.match_id can point at either: the
// seeded demo rooms reference mock-data.ts's matches, real rooms (created
// against a real fixture) reference public.matches.

/** Server-only. Resolves a match id from either the real matches table or the mock roster. */
export async function getMatchById(id: string): Promise<Match | undefined> {
  if (!ROOM_UUID_RE.test(id)) return mockMatchById(id);

  const supabase = await createClient();
  const { data } = await supabase.from("matches").select(MATCH_COLUMNS).eq("id", id).maybeSingle();
  if (data) return mapMatchRow(data as MatchRow);
  return mockMatchById(id);
}
