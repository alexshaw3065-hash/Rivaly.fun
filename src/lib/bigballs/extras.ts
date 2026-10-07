// Big Balls extras for the leagues it scores (UCL, La Liga, Bundesliga, Serie
// A, Ligue 1, MLS): who scored (and assisted) each goal, and the post-match
// team statistics. Display only: nothing here settles a room (goal markets
// read the score; corner and card markets stay hidden for these leagues).
// Shared by the Render worker and the app, like sync.ts.
//
// Budget (500 calls a day on the free plan, docs/plans/match-data-providers.md):
// one events call per tick that saw a goal, plus one events and one statistics
// call at full time — matches with rooms first. Matches without rooms get the
// full-time pair only while the day is comfortably under budget.

import { bbGet, usedToday } from "./client";
import type { Db } from "./sync";
import type { BoxScore, BoxScoreSide } from "../types";

/** Above this many calls today, extras stop (scores and settlement keep the rest). */
export const EXTRAS_BUDGET = 400;
/** Matches nobody has a room on only get extras while the day is this quiet. */
export const BACKFILL_BUDGET = 250;

interface BbEvent {
  elapsed: number | null;
  elapsed_extra: number | null;
  team: string | null;
  player_name: string | null;
  assist_name: string | null;
  event_type: string | null;
  event_detail: string | null;
}

export interface ScorerFact {
  side: "home" | "away";
  minute: number | null;
  player: string;
  assist: string | null;
  ownGoal: boolean;
  penalty: boolean;
}

type BbStats = Record<string, number | string | null>;

type BoxSide = BoxScoreSide;

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * The goals Big Balls names, in match order. Its feed sometimes sends a goal
 * twice, once without a name: an unnamed goal at the same minute and team as
 * a named one is that duplicate.
 */
export function scorersFrom(events: BbEvent[], homeTeam: string, awayTeam: string): ScorerFact[] {
  const goals = events.filter((e) => norm(e.event_type) === "goal" && !/missed|cancelled|disallowed/i.test(e.event_detail ?? ""));
  const named = goals.filter((e) => e.player_name);
  const out: ScorerFact[] = [];
  for (const e of goals) {
    if (!e.player_name && named.some((x) => x.elapsed === e.elapsed && norm(x.team) === norm(e.team))) continue;
    const side = norm(e.team) === norm(homeTeam) ? "home" : norm(e.team) === norm(awayTeam) ? "away" : null;
    if (!side || !e.player_name) continue;
    out.push({
      side,
      minute: e.elapsed != null ? e.elapsed + (e.elapsed_extra ?? 0) : null,
      player: e.player_name,
      assist: e.assist_name ?? null,
      ownGoal: /own/i.test(e.event_detail ?? ""),
      penalty: /penalty/i.test(e.event_detail ?? ""),
    });
  }
  return out.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

function side(s: BbStats | undefined): BoxSide {
  return {
    possession: n(s?.ball_possession),
    shots: n(s?.total_shots),
    onTarget: n(s?.shots_on_target),
    corners: n(s?.corner_kicks),
    fouls: n(s?.fouls),
    offsides: n(s?.offsides),
    yellow: n(s?.yellow_cards),
    red: n(s?.red_cards),
    saves: n(s?.goalkeeper_saves),
    passes: n(s?.total_passes),
    accuratePasses: n(s?.accurate_passes),
  };
}

interface MatchRef {
  id: string;
  provider_ref: string;
  home_team: string;
  away_team: string;
}

/**
 * Names the goals we already logged from score changes. Our goal rows are
 * numbered in the order the score moved; the nth goal for a side gets the nth
 * goal Big Balls names for that side (by its team label). Display only, so a
 * mismatch just leaves a goal unnamed or named in the wrong order.
 */
export async function nameGoals(db: Db, key: string, match: MatchRef): Promise<number> {
  if (usedToday() >= EXTRAS_BUDGET) return 0;
  const events = await bbGet<BbEvent[]>(`/v1/matches/${match.provider_ref}/events`, key);
  const scorers = scorersFrom(events, match.home_team, match.away_team);
  if (scorers.length === 0) return 0;

  const { data: rows } = await db
    .from("match_events")
    .select("id, provider_seq, payload")
    .eq("match_id", match.id)
    .eq("action", "goal")
    .order("provider_seq", { ascending: true });
  const ours = ((rows ?? []) as { id: string; provider_seq: number; payload: Record<string, unknown> | null }[]).filter((r) => r.payload?.source === "bigballs");
  let named = 0;
  for (const s of ["home", "away"] as const) {
    const theirs = scorers.filter((x) => x.side === s);
    const mine = ours.filter((r) => r.payload?._side === s);
    for (let i = 0; i < Math.min(theirs.length, mine.length); i++) {
      const g = theirs[i];
      const p = mine[i].payload ?? {};
      if (p._player === g.player && p._assist === g.assist) continue;
      await db
        .from("match_events")
        .update({ minute: g.minute, payload: { ...p, _player: g.player, _assist: g.assist, _own: g.ownGoal, _penalty: g.penalty } })
        .eq("id", mine[i].id);
      named += 1;
    }
  }
  return named;
}

/** The post-match team statistics: stored on the match, and the corners and cards copied to their columns. */
export async function fetchBoxScore(db: Db, key: string, match: MatchRef): Promise<boolean> {
  if (usedToday() >= EXTRAS_BUDGET) return false;
  const stats = await bbGet<{ home?: BbStats; away?: BbStats }>(`/v1/matches/${match.provider_ref}/statistics`, key);
  if (!stats?.home || !stats?.away) return false;
  // The provider's own team labels decide which block is whose, in case it ever differs from home/away order.
  const swap = norm(String(stats.home.team_name ?? "")) === norm(match.away_team);
  const box: BoxScore = { home: side(swap ? stats.away : stats.home), away: side(swap ? stats.home : stats.away), source: "bigballs", fetchedAt: new Date().toISOString() };
  await db
    .from("matches")
    .update({
      box_score: box,
      home_corners: box.home.corners,
      away_corners: box.away.corners,
      home_yellow_cards: box.home.yellow,
      away_yellow_cards: box.away.yellow,
      home_red_cards: box.home.red,
      away_red_cards: box.away.red,
    })
    .eq("id", match.id);
  return true;
}
