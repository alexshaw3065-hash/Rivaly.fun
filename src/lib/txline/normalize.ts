// Relative rather than the "@/" alias on purpose: this module is imported by
// the standalone SSE worker (worker/), which builds outside Next and has no
// path-alias config. Keeping it relative means one copy of the sport-branching
// logic serves both.
import type { MatchStatus } from "../types";
import { SPORT_US_FOOTBALL, type TxLineScores } from "./types";

// Actions worth keeping as discrete events. The feed emits ~40 action types
// per match including weather, pitch, jersey and possession, which would bury
// the moments that matter. This is the football vocabulary, verified against
// real payloads.
const NOTABLE_ACTIONS = new Set([
  "goal",
  "penalty",
  "var",
  "var_end",
  "red_card",
  "yellow_card",
  "substitution",
  "kickoff",
  "halftime_finalised",
  "game_finalised",
]);

/**
 * Total points/goals for a participant, per sport.
 *
 * Soccer reports Total.Goals with H1/HT/H2 periods; NFL reports Total.Score
 * with Q1..Q4 periods and its own Touchdown/FieldGoal breakdown. Verified
 * against a real finished game of each.
 */
function totalFor(
  record: TxLineScores,
  participant: "Participant1" | "Participant2",
  sportId: number,
): number | null {
  const total = record.Score?.[participant]?.Total as Record<string, number> | undefined;
  if (!total) return null;
  const value = sportId === SPORT_US_FOOTBALL ? total.Score : total.Goals;
  // A participant who hasn't scored may have no key at all rather than a
  // zero, and periods are sparse for the same reason.
  return typeof value === "number" ? value : 0;
}

export interface NormalizedMatch {
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  lastSeq: number | null;
  providerStatusId: number | null;
  stats: Record<string, number> | null;
}

export interface NormalizedEvent {
  providerSeq: number;
  action: string;
  minute: number | null;
  participant: number | null;
  playerId: number | null;
  payload: Record<string, unknown> | null;
  occurredAt: string;
}

/**
 * Collapse a fixture's score records into current match state.
 *
 * Status comes from actions, not GameState or StatusId: GameState reads
 * "scheduled" for matches finished days earlier, and StatusId is a numeric
 * code whose meaning isn't recoverable from the published spec. The actions
 * kickoff / game_finalised are unambiguous and were confirmed in real data.
 */
export function normalizeMatch(records: TxLineScores[], sportId: number): NormalizedMatch | null {
  if (records.length === 0) return null;

  // The snapshot array arrives unordered — sorting is required, not defensive.
  const sorted = [...records].sort((a, b) => a.Seq - b.Seq);

  const actions = new Set(sorted.map((r) => r.Action));
  let status: MatchStatus = "scheduled";
  if (actions.has("game_finalised")) status = "finished";
  else if (actions.has("kickoff")) status = "live";

  // The highest-Seq record may be a comment or similar with no Score, so take
  // the most recent one that actually carries scores.
  const scored = sorted.filter((r) => r.Score && Object.keys(r.Score).length > 0);
  const latest = scored[scored.length - 1];
  const last = sorted[sorted.length - 1];

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  if (latest) {
    const p1 = totalFor(latest, "Participant1", sportId);
    const p2 = totalFor(latest, "Participant2", sportId);
    homeScore = latest.Participant1IsHome ? p1 : p2;
    awayScore = latest.Participant1IsHome ? p2 : p1;
  }

  return {
    status,
    homeScore,
    awayScore,
    lastSeq: last.Seq ?? null,
    providerStatusId: last.StatusId ?? null,
    stats: last.Stats ?? null,
  };
}

/**
 * Pick out the events worth storing.
 *
 * Keeps anything in NOTABLE_ACTIONS, plus any record where the score changed.
 * That second rule is what makes this work for NFL without hardcoding its
 * action vocabulary — a touchdown shows up as a score delta whatever it's
 * called.
 */
export function normalizeEvents(records: TxLineScores[], sportId: number): NormalizedEvent[] {
  const sorted = [...records].sort((a, b) => a.Seq - b.Seq);
  const events: NormalizedEvent[] = [];

  let prevP1: number | null = null;
  let prevP2: number | null = null;

  for (const r of sorted) {
    const p1 = totalFor(r, "Participant1", sportId);
    const p2 = totalFor(r, "Participant2", sportId);
    const scoreChanged =
      (p1 !== null && prevP1 !== null && p1 !== prevP1) || (p2 !== null && prevP2 !== null && p2 !== prevP2);

    if (p1 !== null) prevP1 = p1;
    if (p2 !== null) prevP2 = p2;

    if (!NOTABLE_ACTIONS.has(r.Action) && !scoreChanged) continue;
    if (typeof r.Seq !== "number") continue;

    events.push({
      providerSeq: r.Seq,
      action: r.Action,
      minute: r.Data?.Minutes ?? null,
      participant: r.Data?.Participant ?? null,
      playerId: r.Data?.PlayerId ?? null,
      payload: (r.Data as Record<string, unknown>) ?? null,
      occurredAt: new Date(Number(r.Ts)).toISOString(),
    });
  }

  return events;
}
