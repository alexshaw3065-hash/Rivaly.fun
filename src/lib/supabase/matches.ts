import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ROOM_UUID_RE } from "@/lib/supabase/room-mapper";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import type { Match } from "@/lib/types";

export { MATCH_COLUMNS };

/**
 * Server-only. A match from public.matches, or undefined — never a sample
 * match. Memoised per request: a page and its metadata ask for it once.
 */
export const getMatchById = cache(async function getMatchById(id: string): Promise<Match | undefined> {
  if (!ROOM_UUID_RE.test(id)) return undefined;

  const supabase = await createClient();
  const { data } = await supabase.from("matches").select(MATCH_COLUMNS).eq("id", id).maybeSingle();
  return data ? mapMatchRow(data as MatchRow) : undefined;
});
