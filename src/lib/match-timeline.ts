// The room's match timeline: raw match events → markers on a 0'–90' track
// (or a wall-clock track for sports without a match minute), the score at
// any minute, and the room's own pulse — how hard the chat went, minute by
// minute. Pure (no React, no Supabase) so the server builds it and the
// browser extends it with live events the same way. Tested in
// match-timeline.test.ts.
//
// TxLINE sends player IDs but no names, so markers describe the moment —
// type, minute, goal type, card reason, VAR outcome, the score, the team
// where the feed says it — never an invented player.

export type TimelineKind = "goal" | "penalty" | "yellow" | "red" | "var" | "var-end" | "kickoff" | "halftime" | "fulltime";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  /** Position on the track (match minutes, or wall minutes for NFL). */
  minute: number;
  side: "home" | "away" | null;
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
}

export const HEAT_BUCKETS = 45;
const REACTION_WINDOW_MS = 120_000;
const HALFTIME_BREAK_MIN = 15;

const GOAL_TYPES: Record<string, string> = {
  Head: "Header",
  Header: "Header",
  Penalty: "Penalty",
  OwnGoal: "Own goal",
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
    case "red_card":
      return { kind: "red", title: "Red card", detail: p.Type === "SecondYellow" ? "Second yellow" : typeof p.Type === "string" ? p.Type : "Straight red" };
    case "var":
      return { kind: "var", title: "VAR check", detail: typeof p.Type === "string" ? `Checking: ${p.Type.toLowerCase()}` : null };
    case "var_end":
      return { kind: "var-end", title: "VAR decision", detail: p.Outcome === "Overturned" ? "Overturned" : "Decision stands" };
    case "kickoff":
      return { kind: "kickoff", title: "Kick-off", detail: null };
    case "halftime_finalised":
      return { kind: "halftime", title: "Half-time", detail: null };
    case "game_finalised":
      return { kind: "fulltime", title: "Full time", detail: null };
    default:
      return null;
  }
}

/** One stored event → a marker (null for the actions the timeline skips). */
export function eventFromRow(row: EventRow, ctx: { sport: "soccer" | "nfl"; kickoffAt: number; halftimeAt: number | null }): TimelineEvent | null {
  const p = row.payload ?? {};
  const d = describe(row.action, p);
  if (!d) return null;
  const at = +new Date(row.occurredAt);
  const minute =
    ctx.sport === "soccer"
      ? typeof row.minute === "number" && row.minute > 0
        ? row.minute
        : d.kind === "kickoff"
          ? 0
          : d.kind === "halftime"
            ? 45
            : wallToMinute(at, ctx.kickoffAt, ctx.halftimeAt)
      : Math.max(0, (at - ctx.kickoffAt) / 60_000);
  const score = typeof p._home === "number" && typeof p._away === "number" ? { home: p._home, away: p._away } : null;
  const side = p._side === "home" || p._side === "away" ? p._side : null;
  return { id: row.id, kind: d.kind, minute, side, title: d.title, detail: d.detail, score, at, reactions: null };
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
}): TimelineData {
  const { sport, kickoffAt } = input;
  const ht = input.rows.find((r) => r.action === "halftime_finalised");
  const halftimeAt = ht ? +new Date(ht.occurredAt) : null;
  const ctx = { sport, kickoffAt, halftimeAt };

  const events = input.rows
    .map((r) => eventFromRow(r, ctx))
    .filter((e): e is TimelineEvent => e !== null);
  // Full time sits at the end of play (90' or the last stoppage-time moment),
  // not at the wall-clock time the whistle was logged.
  if (sport === "soccer") {
    const lastInPlay = events.reduce((m, e) => (e.kind === "fulltime" ? m : Math.max(m, e.minute)), 0);
    for (const e of events) if (e.kind === "fulltime") e.minute = Math.max(90, Math.ceil(lastInPlay));
  }
  events.sort((a, b) => a.minute - b.minute || a.at - b.at);

  // Goals: fill in the team from the score change where the feed didn't say.
  let lastScore: { home: number; away: number } | null = { home: 0, away: 0 };
  for (const e of events) {
    if (e.kind === "goal" && !e.side) e.side = goalSide(lastScore, e.score);
    if (e.score) lastScore = e.score;
  }

  // The room's reaction to each moment.
  const times = [...input.messageTimes].sort((a, b) => a - b);
  for (const e of events) e.reactions = times.filter((t) => t >= e.at && t < e.at + REACTION_WINDOW_MS).length;

  const maxMinute = events.reduce((m, e) => Math.max(m, e.minute), 0);
  const domain = sport === "soccer" ? Math.max(90, Math.ceil(maxMinute)) : Math.max(180, Math.ceil(maxMinute) + 5);

  // The room's pulse: messages per slice of the track.
  const heat = new Array<number>(HEAT_BUCKETS).fill(0);
  for (const t of times) {
    if (t < kickoffAt) continue;
    const m = sport === "soccer" ? wallToMinute(t, kickoffAt, halftimeAt) : (t - kickoffAt) / 60_000;
    const i = Math.floor((m / domain) * HEAT_BUCKETS);
    if (i >= 0 && i < HEAT_BUCKETS) heat[i]++;
  }

  return { sport, domain, events, heat, kickoffAt, halftimeAt };
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
  const clock = data.sport === "soccer" ? wallToMinute(now, data.kickoffAt, data.halftimeAt) : (now - data.kickoffAt) / 60_000;
  const last = data.events.reduce((m, e) => Math.max(m, e.minute), 0);
  return Math.min(data.domain, Math.max(last, clock));
}
