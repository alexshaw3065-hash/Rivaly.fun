import { createClient } from "@/lib/supabase/server";
import { matchById as mockMatchById } from "@/lib/mock-data";
import { ROOM_UUID_RE } from "@/lib/supabase/room-mapper";
import type { Match, MatchStatus } from "@/lib/types";

// Same mock-first-check-then-real convention used everywhere else in this
// codebase (getProfileById, getRoomById) — real ids are UUIDs, every mock
// match id is a short "m1"-style string, so there's no ambiguity between
// the two id spaces. Needed because rooms.match_id can point at either: the
// seeded demo rooms reference mock-data.ts's matches, real rooms (created
// against a real fixture) reference public.matches.
export const MATCH_COLUMNS = "id, competition, home_team, away_team, kickoff_at, status, home_score, away_score";

interface MatchRow {
  id: string;
  competition: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export function mapMatchRow(row: MatchRow): Match {
  return {
    id: row.id,
    competition: row.competition,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    kickoffAt: row.kickoff_at,
    status: row.status as MatchStatus,
    homeScore: row.home_score,
    awayScore: row.away_score,
  };
}

/** Server-only. Resolves a match id from either the real matches table or the mock roster. */
export async function getMatchById(id: string): Promise<Match | undefined> {
  if (!ROOM_UUID_RE.test(id)) return mockMatchById(id);

  const supabase = await createClient();
  const { data } = await supabase.from("matches").select(MATCH_COLUMNS).eq("id", id).maybeSingle();
  if (data) return mapMatchRow(data as MatchRow);
  return mockMatchById(id);
}
