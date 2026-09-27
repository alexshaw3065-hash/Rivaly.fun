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

/** NFL's feed speaks its own language — never soccer's "penalty shout" or "extra time". */
function nflMoment(action: string, p: Record<string, unknown>, ctx: MomentContext, team: string | undefined): MatchMoment | null {
  const at = ctx.nfl ? nflTick(ctx.nfl, p) : null;
  const when = at ? ` · ${nflClockLabel(at.quarter, at.clock)}` : "";
  const by = team ? ` · ${team}` : "";
  switch (action) {
    case "kickoff": {
      // Only a quarter's first snap (clock at 15:00): Q1, Q3 and overtime. Every
      // kick after a score is a kickoff too, and says nothing new.
      if (!at || at.clock !== 900) return null;
      if (at.quarter === 1) return { label: "Kickoff", tone: "whistle" };
      if (at.quarter === 3) return { label: "Second half", tone: "whistle" };
      if (at.quarter >= 5) return { label: "Overtime", tone: "whistle" };
      return null;
    }
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
    // The feed's "possible" flags: the beat before the outcome. Only raised
    // flags get a line; the record that clears them says nothing.
    case "possible": {
      if (p.Touchdown === true) return { label: `👀 Touchdown threat${by}${when}`, tone: "whistle" };
      if (p.FieldGoal === true) return { label: `👀 Field goal try${by}${when}`, tone: "whistle" };
      if (p.Safety === true) return { label: `👀 Possible safety${when}`, tone: "whistle" };
      if (p.Turnover === true) return { label: `👀 Possible turnover${when}`, tone: "var" };
      if (p.Penalty === true) return { label: `🚩 Flag on the play${when}`, tone: "var" };
      if (p.Challenge === true) return { label: `🚩 Coach's challenge${when}`, tone: "var" };
      if (p.BigPlay === true) return { label: `⚡ Big play${by}${when}`, tone: "whistle" };
      return null;
    }
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
  switch (action) {
    case "kickoff": {
      const k = kickoffKind(p);
      if (k === "restart") return null;
      return { label: k === "second-half" ? "Second half" : k === "extra-time" ? "Extra time" : "Kick-off", tone: "whistle" };
    }
    case "halftime_finalised":
      return { label: "Half-time", tone: "whistle" };
    case "game_finalised":
      return { label: "Full time", tone: "whistle" };
    case "goal":
      return { label: `⚽ GOAL${at(minute)}${who(p, names, p.GoalType === "Own" || p.GoalType === "OwnGoal" ? " (OG)" : "")}`, tone: "goal" };
    case "touchdown":
      return { label: `🏈 TOUCHDOWN${at(minute)}`, tone: "goal" };
    case "field_goal":
      return p.Outcome === "successful" ? { label: `🏈 Field goal${at(minute)}`, tone: "goal" } : null;
    case "safety":
      return { label: `Safety${at(minute)}`, tone: "goal" };
    case "penalty":
      return { label: `Penalty${at(minute)}`, tone: "var" };
    case "yellow_card":
      return { label: `🟨 Yellow card${at(minute)}${who(p, names)}`, tone: "card" };
    case "red_card":
      return { label: `🟥 Red card${at(minute)}${who(p, names)}`, tone: "card" };
    case "var":
      return { label: `VAR check${typeof p.Type === "string" ? ` · ${p.Type.toLowerCase()}` : ""}`, tone: "var" };
    // The feed's "possible" flags: the beat before an outcome — a shot that
    // could go in, a penalty shout, a VAR look. Only raised flags get a line;
    // the record that clears them says nothing.
    case "possible": {
      if (p.Penalty === true) return { label: `👀 Penalty shout${at(minute)}${team ? ` · ${team}` : ""}`, tone: "var" };
      if (p.VAR === true) return { label: `👀 Possible VAR check${at(minute)}`, tone: "var" };
      if (p.RedCard === true) return { label: `👀 Possible red card${at(minute)}`, tone: "card" };
      if (p.Goal === true) return { label: `👀 Big chance${at(minute)}${team ? ` · ${team}` : ""}`, tone: "whistle" };
      return null;
    }
    case "additional_time":
      return typeof p.Minutes === "number" && p.Minutes > 0 ? { label: `⏱ +${p.Minutes} minutes added`, tone: "whistle" } : null;
    case "var_end":
      return { label: `VAR: ${p.Outcome === "Overturned" ? "overturned" : "decision stands"}`, tone: "var" };
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
