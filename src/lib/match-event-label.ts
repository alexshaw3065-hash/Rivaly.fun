// Turns a raw TxLINE match event into the one line the room's feed shows —
// or null for the ~30 action types nobody in a room cares about in the
// moment (substitutions, corners, conversions, corrections). Shared by the
// server's initial fetch and the browser's realtime stream so both read the
// same. Environment-agnostic: no Supabase client here.

import { kickoffKind } from "./match-feed.ts";
import { nflClockLabel, nflTick, type NflClock } from "./nfl-clock.ts";

export type EventTone = "goal" | "card" | "var" | "whistle" | "takeover-yes" | "takeover-no";

export interface MatchMoment {
  label: string;
  tone: EventTone;
}

const at = (minute: number | null | undefined) => (typeof minute === "number" && minute > 0 ? ` ${minute}'` : "");

/** " · Cunha" when the feed named the player and the line-ups say who that is. */
function who(p: Record<string, unknown>, names: Record<number, string> | undefined, suffix = ""): string {
  const id = typeof p.PlayerId === "number" ? p.PlayerId : null;
  const name = id !== null ? names?.[id] : undefined;
  return name ? ` · ${name}${suffix}` : "";
}

/** What the labels can name: players from the line-ups, teams by code. */
export interface MomentContext {
  names?: Record<number, string>;
  teams?: { home: string; away: string };
  sport?: "soccer" | "nfl";
  /** NFL only: the running quarter, advanced by every record (see nfl-clock.ts). */
  nfl?: NflClock;
}

/**
 * NFL chat lines — only the moments that matter: kickoff, every score,
 * halftime, overtime and the final. The feed's early-warning flags (a flag on
 * the play, a big play, a touchdown threat) fire every few plays and flooded
 * the room; they stay off the chat.
 */
function nflMoment(action: string, p: Record<string, unknown>, ctx: MomentContext, team: string | undefined): MatchMoment | null {
  const at = ctx.nfl ? nflTick(ctx.nfl, p) : null;
  const when = at ? ` · ${nflClockLabel(at.quarter, at.clock)}` : "";
  const by = team ? ` · ${team}` : "";
  // The clock resetting into the 3rd quarter is the end of the first half.
  if (at?.newQuarter && at.quarter === 3) return { label: "Halftime", tone: "whistle" };
  switch (action) {
    case "kickoff":
      // A quarter's first snap only (clock at 15:00) — every kick after a score is a kickoff too.
      if (!at || at.clock !== 900) return null;
      if (at.quarter === 1) return { label: "Kickoff", tone: "whistle" };
      if (at.quarter >= 5) return { label: "Overtime", tone: "whistle" };
      return null;
    case "halftime_finalised":
      return { label: "Halftime", tone: "whistle" };
    case "game_finalised":
      return { label: "Final", tone: "whistle" };
    case "touchdown":
      return { label: `🏈 TOUCHDOWN${by}${when}`, tone: "goal" };
    case "field_goal":
      return p.Outcome === "successful" ? { label: `🏈 Field goal${by}${when}`, tone: "goal" } : null;
    case "safety":
      return { label: `Safety${by}${when}`, tone: "goal" };
    default:
      return null;
  }
}

export function matchMoment(
  action: string,
  minute: number | null | undefined,
  payload: Record<string, unknown> | null,
  ctx: MomentContext = {},
): MatchMoment | null {
  const p = payload ?? {};
  const names = ctx.names;
  const team = p._side === "home" ? ctx.teams?.home : p._side === "away" ? ctx.teams?.away : undefined;
  if (ctx.sport === "nfl") return nflMoment(action, p, ctx, team);
  // Soccer chat lines — only kick-off, goals, half-time and full time. Cards,
  // VAR looks, penalty shouts and added time stay on the timeline and in
  // Stats; in the chat they drowned out the room.
  switch (action) {
    case "kickoff":
      return kickoffKind(p) === "start" ? { label: "Kick-off", tone: "whistle" } : null;
    case "halftime_finalised":
      return { label: "Half-time", tone: "whistle" };
    case "game_finalised":
      return { label: "Full time", tone: "whistle" };
    case "goal":
      return { label: `⚽ GOAL${at(minute)}${who(p, names, p.GoalType === "Own" || p.GoalType === "OwnGoal" ? " (OG)" : "")}`, tone: "goal" };
    default:
      return null;
  }
}

/** System feed rows carry their tone in the body prefix so one field round-trips. */
export const MOMENT_PREFIX: Record<EventTone, string> = {
  goal: "§goal§",
  card: "§card§",
  var: "§var§",
  whistle: "§whistle§",
  "takeover-yes": "§takeover-yes§",
  "takeover-no": "§takeover-no§",
};

/** The feed line when an end of the room takes over the stadium. */
export function takeoverMoment(side: "yes" | "no"): MatchMoment {
  return { label: `🏟 ${side.toUpperCase()} end took the stadium`, tone: side === "yes" ? "takeover-yes" : "takeover-no" };
}

export function encodeMoment(m: MatchMoment): string {
  return `${MOMENT_PREFIX[m.tone]}${m.label}`;
}

export function decodeMoment(body: string): MatchMoment {
  for (const [tone, prefix] of Object.entries(MOMENT_PREFIX) as [EventTone, string][]) {
    if (body.startsWith(prefix)) return { tone, label: body.slice(prefix.length) };
  }
  return { tone: "whistle", label: body };
}
