import type { BoxScore, Match, MatchStatus } from "@/lib/types";

// Shared between src/lib/supabase/matches.ts (server) and
// src/lib/use-real-matches.ts (client) — same reason room-mapper.ts exists
// for rooms: one row shape and one mapping function, so adding a column
// means editing it once instead of two call sites quietly drifting apart.
// One string literal, not a concatenation: supabase-js parses the select
// string at the type level, and `a + b` widens to plain `string`.
export const MATCH_COLUMNS =
  "id, competition, home_team, away_team, kickoff_at, status, home_score, away_score, home_score_ht, away_score_ht, home_corners, away_corners, home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards, sport_id, home_touchdowns, away_touchdowns, home_field_goals, away_field_goals, went_to_overtime, provider, provider_status_id, box_score";

export interface MatchRow {
  id: string;
  competition: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_score_ht: number | null;
  away_score_ht: number | null;
  home_corners: number | null;
  away_corners: number | null;
  home_yellow_cards: number | null;
  away_yellow_cards: number | null;
  home_red_cards: number | null;
  away_red_cards: number | null;
  sport_id: number;
  provider_status_id: number | null;
  home_touchdowns: number | null;
  away_touchdowns: number | null;
  home_field_goals: number | null;
  away_field_goals: number | null;
  went_to_overtime: boolean | null;
  provider: string;
  box_score: BoxScore | { none: true } | null;
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
    homeScoreHt: row.home_score_ht,
    awayScoreHt: row.away_score_ht,
    homeCorners: row.home_corners,
    awayCorners: row.away_corners,
    homeYellowCards: row.home_yellow_cards,
    awayYellowCards: row.away_yellow_cards,
    homeRedCards: row.home_red_cards,
    awayRedCards: row.away_red_cards,
    sportId: row.sport_id,
    providerStatusId: row.provider_status_id,
    homeTouchdowns: row.home_touchdowns,
    awayTouchdowns: row.away_touchdowns,
    homeFieldGoals: row.home_field_goals,
    awayFieldGoals: row.away_field_goals,
    wentToOvertime: row.went_to_overtime,
    provider: row.provider,
    boxScore: row.box_score && "home" in row.box_score ? row.box_score : null,
  };
}
