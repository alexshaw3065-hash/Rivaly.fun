// The room's match timeline: raw match events → markers on a 0'–90' track
// (or a wall-clock track for sports without a match minute), the score at
// any minute, and the room's own pulse — how hard the chat went, minute by
// minute. Pure (no React, no Supabase) so the server builds it and the
// browser extends it with live events the same way. Tested in
// match-timeline.test.ts.
//
// Markers describe the moment — type, minute, goal type, card reason, VAR
// outcome, the score, the team — and name the player when the feed gave an
// id the line-ups can put a name to (see match-lineups.ts). Never invented.

import { kickoffKind } from "./match-feed.ts";
import { nflClockLabel, nflGameMinute, nflTick, type NflClock } from "./nfl-clock.ts";

export type TimelineKind = "goal" | "penalty" | "yellow" | "red" | "var" | "var-end" | "kickoff" | "halftime" | "fulltime";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  /** Position on the track: match minutes (soccer) or game minutes, 0-60 plus overtime (NFL). */
  minute: number;
  /** NFL: the game clock at the moment, e.g. "Q2 8:26". */
  clock?: string | null;
  side: "home" | "away" | null;
  /** The scorer / booked player, from the line-ups. */
  player: string | null;
  title: string;
  detail: string | null;
  score: { home: number; away: number } | null;
  at: number;
  /** Room messages in the two minutes after it (null for brand-new events). */
  reactions: number | null;
}

export interface EventRow {
  id: string;
  action: string;
  minute: number | null;
  payload: Record<string, unknown> | null;
  occurredAt: string;
}

export interface TimelineData {
  sport: "soccer" | "nfl";
  domain: number;
  events: TimelineEvent[];
  heat: number[];
  kickoffAt: number;
  halftimeAt: number | null;
  /** Player id → name, so live moments can be named too. */
  players?: Record<number, string>;
  /** NFL: the quarter state after the last row, so live events carry on counting. */
  nfl?: NflClock;
  /** The score through the match — [minute, home, away] from every record that carried it — for the scoreboard rewind. */
  scores?: [number, number, number][];
}

export const HEAT_BUCKETS = 45;
const REACTION_WINDOW_MS = 120_000;
const HALFTIME_BREAK_MIN = 15;

const GOAL_TYPES: Record<string, string> = {
  Head: "Header",
  Header: "Header",
  Penalty: "Penalty",
  OwnGoal: "Own goal",
  Own: "Own goal",
  FreeKick: "Free kick",
  Shot: "Shot",
};

/** Wall-clock time → match minute, allowing for the half-time break. */
export function wallToMinute(at: number, kickoffAt: number, halftimeAt: number | null): number {
  const elapsed = (at - kickoffAt) / 60_000;
  if (halftimeAt === null || at <= halftimeAt) return Math.max(0, elapsed);
  const firstHalf = (halftimeAt - kickoffAt) / 60_000;
  const secondHalfStart = halftimeAt + HALFTIME_BREAK_MIN * 60_000;
  if (at <= secondHalfStart) return Math.max(45, firstHalf);
  return Math.max(45, firstHalf) + (at - secondHalfStart) / 60_000;
}

function describeNfl(
  action: string,
  p: Record<string, unknown>,
  at: { quarter: number; clock: number; newQuarter: boolean } | null,
): { kind: TimelineKind; title: string; detail: string | null } | null {
  // The clock resetting into the 3rd quarter is the end of the first half.
  if (at?.newQuarter && at.quarter === 3) return { kind: "halftime", title: "Halftime", detail: null };
  switch (action) {
    case "touchdown":
      return { kind: "goal", title: "Touchdown", detail: typeof p.Type === "string" ? `${p.Type} play` : null };
    case "field_goal":
      return p.Outcome === "successful" ? { kind: "goal", title: "Field goal", detail: null } : null;
    case "safety":
      return { kind: "goal", title: "Safety", detail: null };
    case "kickoff":
      // A quarter's first snap only (15:00 on the clock), not every kick after a score.
      if (!at || at.clock !== 900) return null;
      if (at.quarter === 1) return { kind: "kickoff", title: "Kickoff", detail: null };
      if (at.quarter >= 5) return { kind: "kickoff", title: "Overtime", detail: null };
      return null;
    case "halftime_finalised":
      return { kind: "halftime", title: "Halftime", detail: null };
    case "game_finalised":
      return { kind: "fulltime", title: "Final", detail: null };
    default:
      return null;
  }
}

function describe(action: string, p: Record<string, unknown>): { kind: TimelineKind; title: string; detail: string | null } | null {
  switch (action) {
    case "goal": {
      const t = typeof p.GoalType === "string" ? p.GoalType : null;
      return { kind: "goal", title: "Goal", detail: t ? (GOAL_TYPES[t] ?? t) : null };
    }
    case "touchdown":
      return { kind: "goal", title: "Touchdown", detail: typeof p.Type === "string" ? `${p.Type} play` : null };
    case "field_goal":
      return p.Outcome === "successful" ? { kind: "goal", title: "Field goal", detail: null } : null;
    case "safety":
      return { kind: "goal", title: "Safety", detail: null };
    case "penalty":
      return { kind: "penalty", title: "Penalty awarded", detail: null };
    case "yellow_card":
      return { kind: "yellow", title: "Yellow card", detail: null };
    case "var":
      return { kind: "var", title: "VAR check", detail: typeof p.Type === "string" ? `Checking: ${p.Type.toLowerCase()}` : null };
    case "var_end":
      return { kind: "var-end", title: "VAR decision", detail: p.Outcome === "Overturned" ? "Overturned" : "Decision stands" };
    case "red_card":
      return { kind: "red", title: "Red card", detail: p.Type === "SecondYellow" ? "Second yellow" : typeof p.Type === "string" ? p.Type : "Straight red" };
    case "kickoff":
      // The match's first kick only — the second half and extra time start at the half-time notch.
      return kickoffKind(p) === "start" ? { kind: "kickoff", title: "Kick-off", detail: null } : null;
    case "halftime_finalised":
      return { kind: "halftime", title: "Half-time", detail: null };
    case "game_finalised":
      return { kind: "fulltime", title: "Full time", detail: null };
    default:
      return null;
  }
}

/** One stored event → a marker (null for the actions the timeline skips). */
export function eventFromRow(
  row: EventRow,
  ctx: { sport: "soccer" | "nfl"; kickoffAt: number; halftimeAt: number | null; players?: Record<number, string>; nfl?: NflClock },
): TimelineEvent | null {
  const p = row.payload ?? {};
  // NFL: every row advances the quarter count, even the ones with no marker.
  const nflAt = ctx.sport === "nfl" && ctx.nfl ? nflTick(ctx.nfl, p) : null;
  const d = ctx.sport === "nfl" ? describeNfl(row.action, p, nflAt) : describe(row.action, p);
  if (!d) return null;
  const at = +new Date(row.occurredAt);
  const nflPos = nflAt ?? (ctx.nfl && ctx.nfl.last !== null ? { quarter: ctx.nfl.quarter, clock: ctx.nfl.last } : null);
  const minute =
    ctx.sport === "soccer"
      ? typeof row.minute === "number" && row.minute > 0
        ? row.minute
        : d.kind === "kickoff"
          ? d.title === "Kick-off" ? 0 : 45
          : d.kind === "halftime"
            ? 45
            : wallToMinute(at, ctx.kickoffAt, ctx.halftimeAt)
      : nflPos
        ? nflGameMinute(nflPos.quarter, nflPos.clock)
        : d.kind === "fulltime"
          ? 60
          : 0;
  const score = typeof p._home === "number" && typeof p._away === "number" ? { home: p._home, away: p._away } : null;
  const side = p._side === "home" || p._side === "away" ? p._side : null;
  const player = typeof p.PlayerId === "number" ? (ctx.players?.[p.PlayerId] ?? null) : null;
  // One marker per real event: the feed's first report, confirmation and
  // detail share an event id, so live updates replace rather than stack.
  const id = typeof p._eid === "number" ? `${row.action}:${p._eid}` : row.id;
  const clock = ctx.sport === "nfl" && nflPos && d.kind !== "fulltime" ? nflClockLabel(nflPos.quarter, nflPos.clock) : null;
  return { id, kind: d.kind, minute, clock, side, player, title: d.title, detail: d.detail, score, at, reactions: null };
}

/** Which team a goal was for, from the score before and after it. */
function goalSide(prev: { home: number; away: number } | null, now: { home: number; away: number } | null): "home" | "away" | null {
  if (!prev || !now) return null;
  if (now.home > prev.home) return "home";
  if (now.away > prev.away) return "away";
  return null;
}

export function buildTimeline(input: {
  sport: "soccer" | "nfl";
  kickoffAt: number;
  rows: EventRow[];
  messageTimes: number[];
  players?: Record<number, string>;
}): TimelineData {
  const { sport, kickoffAt, players } = input;
  const ht = input.rows.find((r) => r.action === "halftime_finalised");
  const halftimeAt = ht ? +new Date(ht.occurredAt) : null;
  const nfl: NflClock | undefined = sport === "nfl" ? { quarter: 1, last: null } : undefined;
  const ctx = { sport, kickoffAt, halftimeAt, players, nfl };

  // NFL: wall time -> game minute, sampled at every row, to place the chat's pulse.
  const clockPoints: [number, number][] = [];
  // The score through the match, from every record that carried a snapshot.
  const scores: [number, number, number][] = [];
  const events: TimelineEvent[] = [];
  for (const r of input.rows) {
    const e = eventFromRow(r, ctx);
    if (e) events.push(e);
    const at = +new Date(r.occurredAt);
    if (nfl && nfl.last !== null) clockPoints.push([at, nflGameMinute(nfl.quarter, nfl.last)]);
    const p = r.payload ?? {};
    if (typeof p._home === "number" && typeof p._away === "number") {
      const minute = e
        ? e.minute
        : sport === "soccer"
          ? typeof r.minute === "number" && r.minute > 0
            ? r.minute
            : wallToMinute(at, kickoffAt, halftimeAt)
          : nfl && nfl.last !== null
            ? nflGameMinute(nfl.quarter, nfl.last)
            : 0;
      scores.push([minute, p._home, p._away]);
    }
  }
  if (sport === "nfl") {
    const lastInPlay = events.reduce((m, e) => (e.kind === "fulltime" ? m : Math.max(m, e.minute)), 0);
    for (const e of events) if (e.kind === "fulltime") e.minute = Math.max(60, lastInPlay);
  }
  // Full time sits at the end of play (90' or the last stoppage-time moment),
  // not at the wall-clock time the whistle was logged.
  if (sport === "soccer") {
    const lastInPlay = events.reduce((m, e) => (e.kind === "fulltime" ? m : Math.max(m, e.minute)), 0);
    for (const e of events) if (e.kind === "fulltime") e.minute = Math.max(90, Math.ceil(lastInPlay));
  }
  events.sort((a, b) => a.minute - b.minute || a.at - b.at);

  // Goals: fill in the team from the score change where the feed didn't say
  // — and, for a soccer goal that came without a score, the score from the team.
  let lastScore: { home: number; away: number } | null = { home: 0, away: 0 };
  for (const e of events) {
    if (e.kind === "goal" && !e.side) e.side = goalSide(lastScore, e.score);
    if (e.kind === "goal" && !e.score && sport === "soccer" && e.side && lastScore) {
      const s: { home: number; away: number } = { home: lastScore.home + (e.side === "home" ? 1 : 0), away: lastScore.away + (e.side === "away" ? 1 : 0) };
      scores.push([e.minute, s.home, s.away]);
      lastScore = s;
      continue;
    }
    if (e.score) lastScore = e.score;
  }
  scores.sort((a, b) => a[0] - b[0]);

  // The room's reaction to each moment.
  const times = [...input.messageTimes].sort((a, b) => a - b);
  for (const e of events) e.reactions = times.filter((t) => t >= e.at && t < e.at + REACTION_WINDOW_MS).length;

  const maxMinute = events.reduce((m, e) => Math.max(m, e.minute), 0);
  const domain = sport === "soccer" ? Math.max(90, Math.ceil(maxMinute)) : Math.max(60, Math.ceil(maxMinute));

  // The room's pulse: messages per slice of the track.
  const heat = new Array<number>(HEAT_BUCKETS).fill(0);
  for (const t of times) {
    if (t < kickoffAt) continue;
    const m = sport === "soccer" ? wallToMinute(t, kickoffAt, halftimeAt) : gameMinuteAt(clockPoints, t);
    const i = Math.floor((m / domain) * HEAT_BUCKETS);
    if (i >= 0 && i < HEAT_BUCKETS) heat[i]++;
  }

  return { sport, domain, events, heat, kickoffAt, halftimeAt, players, nfl, scores };
}

/** The score at a point on the track, for the scoreboard rewind: the latest snapshot at or before it (0–0 before the first). */
export function scoreAtMinute(data: Pick<TimelineData, "scores" | "events">, minute: number): { home: number; away: number } {
  let score = { home: 0, away: 0 };
  for (const [m, home, away] of data.scores ?? []) {
    if (m > minute + 1e-9) break;
    score = { home, away };
  }
  // Live events arriving after the page loaded carry their own snapshot.
  for (const e of data.events) if (e.score && e.minute <= minute + 1e-9 && e.minute >= lastPoint(data.scores)) score = e.score;
  return score;
}

function lastPoint(scores: [number, number, number][] | undefined): number {
  return scores && scores.length ? scores[scores.length - 1][0] : 0;
}

/** The label for a point on the track: "30'" · "45+'" · "Q2 8:26". */
export function minuteLabel(sport: "soccer" | "nfl", minute: number): string {
  if (sport === "nfl") {
    // Regulation is Q1–Q4 up to and including 60:00 (Q4 0:00); beyond it, overtime.
    const quarter = minute <= 60 ? Math.min(4, Math.floor(minute / 15) + 1) : 5 + Math.floor((minute - 60) / 15);
    const into = minute - (quarter - 1) * 15;
    return nflClockLabel(quarter, Math.max(0, Math.round((15 - into) * 60)));
  }
  return `${Math.max(0, Math.floor(minute))}\u2019`;
}

/** NFL: the game minute at a wall-clock time, from the last sampled point at or before it. */
function gameMinuteAt(points: [number, number][], t: number): number {
  let m = 0;
  for (const [at, minute] of points) {
    if (at > t) break;
    m = minute;
  }
  return m;
}

/** The score at a point on the track: the latest snapshot at or before it. */
export function scoreAt(events: TimelineEvent[], minute: number): { home: number; away: number } | null {
  let score: { home: number; away: number } | null = null;
  let any = false;
  for (const e of events) {
    if (e.minute > minute) break;
    if (e.score) {
      score = e.score;
      any = true;
    }
  }
  return any ? score : events.some((e) => e.score) ? { home: 0, away: 0 } : null;
}

/** Where the live playhead sits: the later of the last event and the clock. */
export function liveMinute(data: TimelineData, now: number): number {
  // NFL has no wall-clock mapping (its clock stops constantly): the game clock's last reading is live.
  const clock =
    data.sport === "soccer" ? wallToMinute(now, data.kickoffAt, data.halftimeAt) : data.nfl && data.nfl.last !== null ? nflGameMinute(data.nfl.quarter, data.nfl.last) : 0;
  const last = data.events.reduce((m, e) => Math.max(m, e.minute), 0);
  return Math.min(data.domain, Math.max(last, clock));
}
