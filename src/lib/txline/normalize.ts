// Relative rather than the "@/" alias on purpose: this module is imported by
// the standalone SSE worker (worker/), which builds outside Next and has no
// path-alias config. Keeping it relative means one copy of the sport-branching
// logic serves both.
import type { MatchStatus } from "../types";
import type { LineupPosition, StoredLineupTeam } from "../match-lineups";
import { SPORT_SOCCER, SPORT_US_FOOTBALL, type TxLineScores, type TxLineTeamLineup } from "./types";

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
  // For the room's Stats tab: shots (Outcome OnTarget/OffTarget/Woodwork/
  // Blocked), free kicks (fouls, and offsides via FreeKickType) and corners —
  // each carries the team, snapshotted as _side below.
  "shot",
  "free_kick",
  "corner",
  "kickoff",
  "halftime_finalised",
  "game_finalised",
  // The squads, shortly before kick-off — the room's Lineup tab.
  "lineups",
  // Corrections. Names arrive on amends (a card's player, a substitution's
  // in/out), and a discard withdraws an event reported in error. Settlement
  // already reads both as "the feed changed its mind" (resolve.ts).
  "action_amend",
  "action_discarded",
]);

const POSITIONS: Record<number, LineupPosition> = { 34: "GK", 35: "DEF", 36: "MID", 37: "FWD" };

/** "Last, First" → "First Last". */
function displayName(preferred: string): string {
  const [last, first] = preferred.split(",").map((x) => x.trim());
  return first ? `${first} ${last}` : preferred.trim();
}

/** The matchday squads only — starters and the bench, not everyone registered. */
function compactLineups(teams: TxLineTeamLineup[]): StoredLineupTeam[] {
  return teams.map((t) => ({
    name: t.preferredName,
    players: (t.lineups ?? [])
      .filter((p) => p.starter || p.statusId === 0)
      .map((p) => ({
        id: p.player.normativeId,
        name: displayName(p.player.preferredName),
        surname: p.player.preferredName.split(",")[0].trim(),
        number: p.rosterNumber,
        pos: POSITIONS[p.positionId] ?? "MID",
        starter: p.starter,
      })),
  }));
}

/** Clock seconds → the match minute as football counts it (0:00–0:59 is the 1st). */
function clockMinute(seconds: number | undefined): number | null {
  return typeof seconds === "number" && seconds >= 0 ? Math.floor(seconds / 60) + 1 : null;
}

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

/**
 * A stat at a specific period for a participant — soccer only. NFL has no
 * HT/Corners/YellowCards concept (it reports Q1-Q4 and Touchdown/FieldGoal
 * instead), so this deliberately returns null rather than reading a field
 * that wouldn't mean what its name says for that sport.
 */
function periodStat(
  record: TxLineScores,
  participant: "Participant1" | "Participant2",
  sportId: number,
  period: "HT" | "Total",
  stat: "Goals" | "Corners" | "YellowCards" | "RedCards",
): number | null {
  if (sportId !== SPORT_SOCCER) return null;
  const p = record.Score?.[participant]?.[period] as Record<string, number> | undefined;
  if (!p) return null;
  const value = p[stat];
  return typeof value === "number" ? value : 0;
}

/**
 * NFL period stat — HT/Total carry {Score, Touchdown, FieldGoal,
 * 1ptConversion} per participant (verified against a real finished
 * Chiefs v Colts snapshot, including its OT period). Null for soccer.
 */
function nflStat(
  record: TxLineScores,
  participant: "Participant1" | "Participant2",
  sportId: number,
  period: "HT" | "Total",
  stat: "Score" | "Touchdown" | "FieldGoal",
): number | null {
  if (sportId !== SPORT_US_FOOTBALL) return null;
  const p = record.Score?.[participant]?.[period] as Record<string, number> | undefined;
  if (!p) return null;
  const value = p[stat];
  return typeof value === "number" ? value : 0;
}

export interface NormalizedMatch {
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreHt: number | null;
  awayScoreHt: number | null;
  homeCorners: number | null;
  awayCorners: number | null;
  homeYellowCards: number | null;
  awayYellowCards: number | null;
  // The feed's own running count — it drops back when VAR rescinds a red,
  // which is why settlement reads this rather than the red_card event.
  homeRedCards: number | null;
  awayRedCards: number | null;
  homeTouchdowns: number | null;
  awayTouchdowns: number | null;
  homeFieldGoals: number | null;
  awayFieldGoals: number | null;
  wentToOvertime: boolean | null;
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
  let homeScoreHt: number | null = null;
  let awayScoreHt: number | null = null;
  let homeCorners: number | null = null;
  let awayCorners: number | null = null;
  let homeYellowCards: number | null = null;
  let awayYellowCards: number | null = null;
  let homeRedCards: number | null = null;
  let awayRedCards: number | null = null;
  let homeTouchdowns: number | null = null;
  let awayTouchdowns: number | null = null;
  let homeFieldGoals: number | null = null;
  let awayFieldGoals: number | null = null;
  let wentToOvertime: boolean | null = null;

  if (latest) {
    const p1 = totalFor(latest, "Participant1", sportId);
    const p2 = totalFor(latest, "Participant2", sportId);
    homeScore = latest.Participant1IsHome ? p1 : p2;
    awayScore = latest.Participant1IsHome ? p2 : p1;

    // Half-time score: Goals for soccer, Score (points) for NFL — same HT
    // period in both feeds, so both land in the same columns.
    const p1Ht = periodStat(latest, "Participant1", sportId, "HT", "Goals") ?? nflStat(latest, "Participant1", sportId, "HT", "Score");
    const p2Ht = periodStat(latest, "Participant2", sportId, "HT", "Goals") ?? nflStat(latest, "Participant2", sportId, "HT", "Score");
    homeScoreHt = latest.Participant1IsHome ? p1Ht : p2Ht;
    awayScoreHt = latest.Participant1IsHome ? p2Ht : p1Ht;

    const p1Corners = periodStat(latest, "Participant1", sportId, "Total", "Corners");
    const p2Corners = periodStat(latest, "Participant2", sportId, "Total", "Corners");
    homeCorners = latest.Participant1IsHome ? p1Corners : p2Corners;
    awayCorners = latest.Participant1IsHome ? p2Corners : p1Corners;

    const p1Cards = periodStat(latest, "Participant1", sportId, "Total", "YellowCards");
    const p2Cards = periodStat(latest, "Participant2", sportId, "Total", "YellowCards");
    homeYellowCards = latest.Participant1IsHome ? p1Cards : p2Cards;
    awayYellowCards = latest.Participant1IsHome ? p2Cards : p1Cards;

    const p1Reds = periodStat(latest, "Participant1", sportId, "Total", "RedCards");
    const p2Reds = periodStat(latest, "Participant2", sportId, "Total", "RedCards");
    homeRedCards = latest.Participant1IsHome ? p1Reds : p2Reds;
    awayRedCards = latest.Participant1IsHome ? p2Reds : p1Reds;

    const p1Td = nflStat(latest, "Participant1", sportId, "Total", "Touchdown");
    const p2Td = nflStat(latest, "Participant2", sportId, "Total", "Touchdown");
    homeTouchdowns = latest.Participant1IsHome ? p1Td : p2Td;
    awayTouchdowns = latest.Participant1IsHome ? p2Td : p1Td;

    const p1Fg = nflStat(latest, "Participant1", sportId, "Total", "FieldGoal");
    const p2Fg = nflStat(latest, "Participant2", sportId, "Total", "FieldGoal");
    homeFieldGoals = latest.Participant1IsHome ? p1Fg : p2Fg;
    awayFieldGoals = latest.Participant1IsHome ? p2Fg : p1Fg;

    // An OT period only appears once overtime is played, so "no OT" is only
    // a fact after the final whistle — before that it's still unknown.
    if (sportId === SPORT_US_FOOTBALL) {
      const s1 = latest.Score?.Participant1 as Record<string, unknown> | undefined;
      const s2 = latest.Score?.Participant2 as Record<string, unknown> | undefined;
      const hasOt = Boolean(s1?.OTTotal || s2?.OTTotal);
      wentToOvertime = hasOt ? true : status === "finished" ? false : null;
    }
  }

  return {
    status,
    homeScore,
    awayScore,
    homeScoreHt,
    awayScoreHt,
    homeCorners,
    awayCorners,
    homeYellowCards,
    awayYellowCards,
    homeRedCards,
    awayRedCards,
    homeTouchdowns,
    awayTouchdowns,
    homeFieldGoals,
    awayFieldGoals,
    wentToOvertime,
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

    // Snapshot the score at this moment (home/away, not participant 1/2) and,
    // where the feed says which participant it was, the team — so the room's
    // match timeline can say who scored and show the score at any minute.
    const p1Home = r.Participant1IsHome !== false;
    const snapshot: Record<string, unknown> = {};
    if (p1 !== null && p2 !== null) {
      snapshot._home = p1Home ? p1 : p2;
      snapshot._away = p1Home ? p2 : p1;
    }
    // Shots, goals and cards carry the team at the top level; substitutions
    // carry it in Data.
    const participant = r.Data?.Participant ?? r.Participant;
    if (participant === 1 || participant === 2) snapshot._side = (participant === 1) === p1Home ? "home" : "away";
    // The event's id and clock: a first report, its confirmation and later
    // detail (the scorer's name) arrive as separate records sharing one id,
    // and an amend finds its event by clock — see collapseEvents().
    if (typeof r.Id === "number") snapshot._eid = r.Id;
    if (typeof r.Clock?.Seconds === "number") snapshot._clock = r.Clock.Seconds;
    if (r.Action === "lineups" && Array.isArray(r.Lineups)) snapshot.teams = compactLineups(r.Lineups);

    events.push({
      providerSeq: r.Seq,
      action: r.Action,
      minute: r.Data?.Minutes ?? (r.Clock?.Running ? clockMinute(r.Clock.Seconds) : null),
      participant: participant ?? null,
      playerId: r.Data?.PlayerId ?? r.Data?.New?.PlayerId ?? null,
      payload: { ...((r.Data as Record<string, unknown>) ?? {}), ...snapshot },
      occurredAt: new Date(Number(r.Ts)).toISOString(),
    });
  }

  return events;
}
