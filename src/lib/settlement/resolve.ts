// Deciding who won a room — pure functions, no I/O, so every market's rules
// are unit-tested (resolve.test.ts, `npm test`) before real USDC depends on
// them. See docs/plans/escrow-wallet-build.md §4 "Early resolution".
//
// Two layers:
//   1. resolveMarket(): what the match data says *right now* — final
//      (a whistle decided it), locked (it can no longer change, e.g. Over 2.5
//      at 3 goals), void (match cancelled/postponed), open, or manual.
//   2. decideSettlement(): whether it's safe to pay. A locked result only
//      settles after it has held for the safety window (10 min, founder's
//      call) with no review open and no discarded/amended action since —
//      VAR can still take a goal away after it first appears in the feed.
// Only type imports here: Node runs this file directly under `node --test`.

import type { MarketSideDefinition, MatchStatus } from "../types";

export type Outcome = "yes" | "no";

export type Resolution =
  | { kind: "final"; outcome: Outcome } // a whistle decided it (full time / half time)
  | { kind: "locked"; outcome: Outcome } // decided early — needs the safety window
  | { kind: "void" } // cancelled / postponed → refund everyone
  | { kind: "open" } // not decidable yet
  | { kind: "manual" }; // can't be settled from match data

/** The slice of a match the rules read. Scores are points for NFL. */
export interface MatchFacts {
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreHt: number | null;
  awayScoreHt: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeYellowCards?: number | null;
  awayYellowCards?: number | null;
  homeRedCards?: number | null;
  awayRedCards?: number | null;
  homeTouchdowns?: number | null;
  awayTouchdowns?: number | null;
  homeFieldGoals?: number | null;
  awayFieldGoals?: number | null;
  wentToOvertime?: boolean | null;
}

/** A match_events row, reduced to what settlement needs. */
export interface MatchEventFact {
  action: string;
  /** Epoch milliseconds. */
  at: number;
}

const has = (events: MatchEventFact[], action: string) => events.some((e) => e.action === action);
const sum = (a: number | null | undefined, b: number | null | undefined) =>
  a == null || b == null ? null : a + b;

/**
 * Over/under on a count that only ever goes up during a match (goals,
 * corners, points…). Passing the line decides it early either way — Over
 * has won, Under has lost; staying under can only be confirmed at the end.
 */
function overUnder(
  current: number | null,
  comparison: "over" | "under" | undefined,
  threshold: number | undefined,
  decidedAt: "final" | "open",
): Resolution {
  if (current == null || threshold == null || !comparison) return { kind: "open" };
  if (current > threshold) return { kind: "locked", outcome: comparison === "over" ? "yes" : "no" };
  if (decidedAt === "final") return { kind: "final", outcome: comparison === "over" ? "no" : "yes" };
  return { kind: "open" };
}

/** A yes/no "does it happen at all" market backed by an event (red card, penalty, VAR). */
function happens(events: MatchEventFact[], action: string, fullTime: boolean): Resolution {
  if (has(events, action)) return { kind: "locked", outcome: "yes" };
  return fullTime ? { kind: "final", outcome: "no" } : { kind: "open" };
}

const HALF_TIME_MARKETS = new Set<MarketSideDefinition["stat"]>([
  "halftime_result",
  "halftime_correct_score",
  "halftime_total_goals",
  "first_half_points",
]);

export function resolveMarket(def: MarketSideDefinition | null, match: MatchFacts, events: MatchEventFact[]): Resolution {
  const raw = resolveRaw(def, match, events);
  if (raw.kind !== "locked" || !def) return raw;
  // Locked before its whistle needs the safety window; once the whistle that
  // decides this market has gone, the same result is simply final.
  const whistle = HALF_TIME_MARKETS.has(def.stat)
    ? events.some((e) => e.action === "halftime_finalised")
    : match.status === "finished";
  return whistle ? { kind: "final", outcome: raw.outcome } : raw;
}

function resolveRaw(def: MarketSideDefinition | null, match: MatchFacts, events: MatchEventFact[]): Resolution {
  if (!def) return { kind: "manual" };
  if (match.status === "cancelled" || match.status === "postponed") return { kind: "void" };

  const fullTime = match.status === "finished";
  const halfTime = has(events, "halftime_finalised") && match.homeScoreHt != null && match.awayScoreHt != null;
  // Before the half-time whistle, the live score *is* the first-half score.
  const firstHalfLive = match.status === "live" && !has(events, "halftime_finalised");
  const home = match.homeScore;
  const away = match.awayScore;
  const total = sum(home, away);
  const htTotal = sum(match.homeScoreHt, match.awayScoreHt);

  switch (def.stat) {
    case "winner": {
      if (!fullTime || home == null || away == null) return { kind: "open" };
      const actual = home > away ? "home" : home < away ? "away" : "draw";
      return { kind: "final", outcome: actual === def.outcome ? "yes" : "no" };
    }

    case "handicap": {
      if (!fullTime || home == null || away == null || def.threshold == null) return { kind: "open" };
      const margin = def.team === "home" ? home - away : away - home;
      return { kind: "final", outcome: margin > def.threshold ? "yes" : "no" };
    }

    case "total_goals":
    case "total_points":
      return overUnder(total, def.comparison, def.threshold, fullTime ? "final" : "open");

    case "team_points":
      return overUnder(def.team === "home" ? home : away, def.comparison, def.threshold, fullTime ? "final" : "open");

    case "both_score": {
      if (home == null || away == null) return { kind: "open" };
      if (home > 0 && away > 0) return { kind: "locked", outcome: "yes" };
      return fullTime ? { kind: "final", outcome: "no" } : { kind: "open" };
    }

    case "correct_score": {
      if (home == null || away == null || def.homeGoals == null || def.awayGoals == null) return { kind: "open" };
      // Goals only go up: past the called score on either side, it's gone.
      if (home > def.homeGoals || away > def.awayGoals) return { kind: "locked", outcome: "no" };
      if (!fullTime) return { kind: "open" };
      return { kind: "final", outcome: home === def.homeGoals && away === def.awayGoals ? "yes" : "no" };
    }

    case "halftime_result": {
      if (!halfTime) return { kind: "open" };
      const h = match.homeScoreHt!;
      const a = match.awayScoreHt!;
      const actual = h > a ? "home" : h < a ? "away" : "draw";
      return { kind: "final", outcome: actual === def.outcome ? "yes" : "no" };
    }

    case "halftime_correct_score": {
      if (def.homeGoals == null || def.awayGoals == null) return { kind: "open" };
      if (halfTime) {
        const hit = match.homeScoreHt === def.homeGoals && match.awayScoreHt === def.awayGoals;
        return { kind: "final", outcome: hit ? "yes" : "no" };
      }
      if (firstHalfLive && home != null && away != null && (home > def.homeGoals || away > def.awayGoals)) {
        return { kind: "locked", outcome: "no" };
      }
      return { kind: "open" };
    }

    case "halftime_total_goals":
    case "first_half_points": {
      if (halfTime) return overUnder(htTotal, def.comparison, def.threshold, "final");
      if (firstHalfLive) return overUnder(total, def.comparison, def.threshold, "open");
      return { kind: "open" };
    }

    case "second_half_total_goals": {
      if (total == null || htTotal == null || !halfTime) return { kind: "open" };
      return overUnder(total - htTotal, def.comparison, def.threshold, fullTime ? "final" : "open");
    }

    case "corners":
      return overUnder(sum(match.homeCorners, match.awayCorners), def.comparison, def.threshold, fullTime ? "final" : "open");

    case "cards":
      return overUnder(sum(match.homeYellowCards, match.awayYellowCards), def.comparison, def.threshold, fullTime ? "final" : "open");

    case "total_touchdowns":
      return overUnder(sum(match.homeTouchdowns, match.awayTouchdowns), def.comparison, def.threshold, fullTime ? "final" : "open");

    case "total_field_goals":
      return overUnder(sum(match.homeFieldGoals, match.awayFieldGoals), def.comparison, def.threshold, fullTime ? "final" : "open");

    // From the feed's red-card count, not the red_card event: the count
    // drops back when VAR rescinds a red, the event doesn't — and the feed's
    // action_discarded arrives with no payload saying what it discarded.
    case "red_card": {
      const reds = sum(match.homeRedCards, match.awayRedCards);
      if (reds == null) return { kind: "open" };
      if (reds > 0) return { kind: "locked", outcome: "yes" };
      return fullTime ? { kind: "final", outcome: "no" } : { kind: "open" };
    }
    case "penalty":
      return happens(events, "penalty", fullTime);
    case "var":
      return happens(events, "var", fullTime);

    case "overtime": {
      if (match.wentToOvertime === true) return { kind: "locked", outcome: "yes" };
      if (fullTime) return { kind: "final", outcome: match.wentToOvertime ? "yes" : "no" };
      return { kind: "open" };
    }

    case "anytime_scorer":
      return { kind: "manual" };
  }
}

// ---------------------------------------------------------------------------

export const SAFETY_WINDOW_MS = 10 * 60_000;

const REVIEW_PAIRS: [start: string, end: string][] = [
  ["var", "var_end"],
  ["instant_replay", "instant_replay_end"],
];
const CORRECTIONS = new Set(["action_discarded", "action_amend"]);

/** A VAR check / NFL replay has started and not yet finished. */
export function reviewOpen(events: MatchEventFact[]): boolean {
  return REVIEW_PAIRS.some(([start, end]) => {
    const lastStart = Math.max(-Infinity, ...events.filter((e) => e.action === start).map((e) => e.at));
    const lastEnd = Math.max(-Infinity, ...events.filter((e) => e.action === end).map((e) => e.at));
    return lastStart > lastEnd;
  });
}

export function correctedSince(events: MatchEventFact[], since: number): boolean {
  return events.some((e) => CORRECTIONS.has(e.action) && e.at >= since);
}

/** What the settlement job remembers between runs, per room. */
export interface Pending {
  outcome: Outcome;
  since: number;
}

export type Decision =
  | { action: "settle"; outcome: Outcome | "void" }
  | { action: "hold"; pending: Pending | null }; // don't pay yet; store `pending` for next run

/**
 * Turn a resolution into "pay now" or "not yet". Whistles and cancellations
 * settle as soon as no review is open; an early lock must hold, unchanged
 * and uncorrected, for the whole safety window first — and any reversal
 * (the result goes back to open, flips, or a correction lands) restarts it.
 */
export function decideSettlement(
  resolution: Resolution,
  pending: Pending | null,
  events: MatchEventFact[],
  now: number,
  windowMs: number = SAFETY_WINDOW_MS,
): Decision {
  if (resolution.kind === "void") return { action: "settle", outcome: "void" };
  if (resolution.kind === "open" || resolution.kind === "manual") return { action: "hold", pending: null };
  if (reviewOpen(events)) return { action: "hold", pending };

  if (resolution.kind === "final") return { action: "settle", outcome: resolution.outcome };

  // Locked early.
  const same = pending && pending.outcome === resolution.outcome && !correctedSince(events, pending.since);
  if (!same) return { action: "hold", pending: { outcome: resolution.outcome, since: now } };
  if (now - pending.since >= windowMs) return { action: "settle", outcome: resolution.outcome };
  return { action: "hold", pending };
}
