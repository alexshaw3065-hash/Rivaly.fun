// Run with `npm test`. Node's built-in runner + its own TypeScript support —
// no test framework dependency for the one module where a wrong answer
// sends real USDC to the wrong people.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decideSettlement,
  eventFact,
  resolveMarket,
  reviewOpen,
  SAFETY_WINDOW_MS,
  type MatchEventFact,
  type MatchFacts,
} from "./resolve.ts";
import type { MarketSideDefinition } from "../types";

const MIN = 60_000;

function match(over: Partial<MatchFacts> = {}): MatchFacts {
  return { status: "live", homeScore: 0, awayScore: 0, homeScoreHt: null, awayScoreHt: null, ...over };
}
const ev = (action: string, at = 0): MatchEventFact => ({ action, at });
const HT = [ev("halftime_finalised")];
const def = (d: MarketSideDefinition) => d;

describe("resolveMarket — void and manual", () => {
  it("refunds cancelled and postponed matches", () => {
    const d = def({ stat: "total_goals", comparison: "over", threshold: 2.5 });
    assert.deepEqual(resolveMarket(d, match({ status: "cancelled" }), []), { kind: "void" });
    assert.deepEqual(resolveMarket(d, match({ status: "postponed" }), []), { kind: "void" });
  });
  it("never auto-settles the goalscorer market or a free-text room", () => {
    assert.deepEqual(resolveMarket(def({ stat: "anytime_scorer", player: "X" }), match({ status: "finished" }), []), { kind: "manual" });
    assert.deepEqual(resolveMarket(null, match({ status: "finished" }), []), { kind: "manual" });
  });
});

describe("resolveMarket — full-time only markets", () => {
  it("winner waits for full time, then reads the result", () => {
    const home = def({ stat: "winner", outcome: "home" });
    const draw = def({ stat: "winner", outcome: "draw" });
    assert.deepEqual(resolveMarket(home, match({ homeScore: 3, awayScore: 0 }), []), { kind: "open" });
    assert.deepEqual(resolveMarket(home, match({ status: "finished", homeScore: 2, awayScore: 1 }), []), { kind: "final", outcome: "yes" });
    assert.deepEqual(resolveMarket(draw, match({ status: "finished", homeScore: 2, awayScore: 1 }), []), { kind: "final", outcome: "no" });
    assert.deepEqual(resolveMarket(draw, match({ status: "finished", homeScore: 1, awayScore: 1 }), []), { kind: "final", outcome: "yes" });
  });
  it("winning margin needs to beat the line", () => {
    const d = def({ stat: "handicap", team: "away", threshold: 6.5 });
    assert.deepEqual(resolveMarket(d, match({ status: "finished", homeScore: 20, awayScore: 27 }), []), { kind: "final", outcome: "yes" });
    assert.deepEqual(resolveMarket(d, match({ status: "finished", homeScore: 21, awayScore: 27 }), []), { kind: "final", outcome: "no" });
  });
});

describe("resolveMarket — over/under locks early", () => {
  const over = def({ stat: "total_goals", comparison: "over", threshold: 2.5 });
  const under = def({ stat: "total_goals", comparison: "under", threshold: 2.5 });
  it("over wins the moment the line is passed, mid-match", () => {
    assert.deepEqual(resolveMarket(over, match({ homeScore: 2, awayScore: 1 }), []), { kind: "locked", outcome: "yes" });
    assert.deepEqual(resolveMarket(over, match({ homeScore: 2, awayScore: 0 }), []), { kind: "open" });
  });
  it("under loses the moment the line is passed, but can only win at full time", () => {
    assert.deepEqual(resolveMarket(under, match({ homeScore: 3, awayScore: 0 }), []), { kind: "locked", outcome: "no" });
    assert.deepEqual(resolveMarket(under, match({ homeScore: 1, awayScore: 1 }), []), { kind: "open" });
    assert.deepEqual(resolveMarket(under, match({ status: "finished", homeScore: 1, awayScore: 1 }), []), { kind: "final", outcome: "yes" });
  });
  it("a result already locked at the final whistle is simply final", () => {
    assert.deepEqual(resolveMarket(over, match({ status: "finished", homeScore: 2, awayScore: 1 }), []), { kind: "final", outcome: "yes" });
  });
  it("corners, NFL points, touchdowns and field goals follow the same rule", () => {
    assert.deepEqual(
      resolveMarket(def({ stat: "corners", comparison: "over", threshold: 9.5 }), match({ homeCorners: 6, awayCorners: 4 }), []),
      { kind: "locked", outcome: "yes" },
    );
    assert.deepEqual(resolveMarket(def({ stat: "corners", comparison: "over", threshold: 9.5 }), match(), []), { kind: "open" });
    assert.deepEqual(
      resolveMarket(def({ stat: "total_points", comparison: "under", threshold: 44.5 }), match({ homeScore: 24, awayScore: 21 }), []),
      { kind: "locked", outcome: "no" },
    );
    assert.deepEqual(
      resolveMarket(def({ stat: "team_points", team: "home", comparison: "over", threshold: 23.5 }), match({ homeScore: 24, awayScore: 3 }), []),
      { kind: "locked", outcome: "yes" },
    );
    assert.deepEqual(
      resolveMarket(def({ stat: "total_touchdowns", comparison: "over", threshold: 4.5 }), match({ status: "finished", homeTouchdowns: 2, awayTouchdowns: 2 }), []),
      { kind: "final", outcome: "no" },
    );
    assert.deepEqual(
      resolveMarket(def({ stat: "total_field_goals", comparison: "under", threshold: 3.5 }), match({ status: "finished", homeFieldGoals: 1, awayFieldGoals: 2 }), []),
      { kind: "final", outcome: "yes" },
    );
  });
});

describe("resolveMarket — both teams, exact score", () => {
  const btts = def({ stat: "both_score" });
  it("both teams to score locks YES once both have scored", () => {
    assert.deepEqual(resolveMarket(btts, match({ homeScore: 1, awayScore: 1 }), []), { kind: "locked", outcome: "yes" });
    assert.deepEqual(resolveMarket(btts, match({ homeScore: 2, awayScore: 0 }), []), { kind: "open" });
    assert.deepEqual(resolveMarket(btts, match({ status: "finished", homeScore: 2, awayScore: 0 }), []), { kind: "final", outcome: "no" });
  });
  it("exact score is lost early once either side passes the call", () => {
    const d = def({ stat: "correct_score", homeGoals: 1, awayGoals: 0 });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 2, awayScore: 0 }), []), { kind: "locked", outcome: "no" });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 1, awayScore: 0 }), []), { kind: "open" });
    assert.deepEqual(resolveMarket(d, match({ status: "finished", homeScore: 1, awayScore: 0 }), []), { kind: "final", outcome: "yes" });
    assert.deepEqual(resolveMarket(d, match({ status: "finished", homeScore: 0, awayScore: 0 }), []), { kind: "final", outcome: "no" });
  });
});

describe("resolveMarket — halves", () => {
  it("half-time result settles at the half-time whistle, not before", () => {
    const d = def({ stat: "halftime_result", outcome: "home" });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 1, awayScore: 0, homeScoreHt: 1, awayScoreHt: 0 }), []), { kind: "open" });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 1, awayScore: 0, homeScoreHt: 1, awayScoreHt: 0 }), HT), { kind: "final", outcome: "yes" });
  });
  it("half-time exact score is lost early during the first half", () => {
    const d = def({ stat: "halftime_correct_score", homeGoals: 0, awayGoals: 0 });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 1, awayScore: 0 }), []), { kind: "locked", outcome: "no" });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 2, awayScore: 0, homeScoreHt: 0, awayScoreHt: 0 }), HT), { kind: "final", outcome: "yes" });
  });
  it("first-half over locks during the first half and is final at half-time", () => {
    const d = def({ stat: "halftime_total_goals", comparison: "over", threshold: 1.5 });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 1, awayScore: 1 }), []), { kind: "locked", outcome: "yes" });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 3, awayScore: 1, homeScoreHt: 1, awayScoreHt: 0 }), HT), { kind: "final", outcome: "no" });
  });
  it("second-half goals count only goals after the break", () => {
    const d = def({ stat: "second_half_total_goals", comparison: "over", threshold: 2.5 });
    assert.deepEqual(resolveMarket(d, match({ homeScore: 3, awayScore: 0 }), []), { kind: "open" }); // no HT yet
    assert.deepEqual(resolveMarket(d, match({ homeScore: 3, awayScore: 1, homeScoreHt: 1, awayScoreHt: 0 }), HT), { kind: "locked", outcome: "yes" });
    assert.deepEqual(
      resolveMarket(d, match({ status: "finished", homeScore: 3, awayScore: 0, homeScoreHt: 2, awayScoreHt: 0 }), HT),
      { kind: "final", outcome: "no" },
    );
  });
});

describe("resolveMarket — events", () => {
  it("red card locks YES on the first red, NO only at full time", () => {
    const d = def({ stat: "red_card" });
    assert.deepEqual(resolveMarket(d, match({ homeRedCards: 1, awayRedCards: 0 }), [ev("red_card")]), { kind: "locked", outcome: "yes" });
    assert.deepEqual(resolveMarket(d, match({ homeRedCards: 0, awayRedCards: 0 }), []), { kind: "open" });
    assert.deepEqual(resolveMarket(d, match({ status: "finished", homeRedCards: 0, awayRedCards: 0 }), []), { kind: "final", outcome: "no" });
  });
  it("a red card VAR rescinds reads as open again, even though the event remains", () => {
    const d = def({ stat: "red_card" });
    assert.deepEqual(
      resolveMarket(d, match({ homeRedCards: 0, awayRedCards: 0 }), [ev("red_card"), ev("var"), ev("var_end")]),
      { kind: "open" },
    );
  });
  it("no red-card data yet means wait, never guess", () => {
    assert.deepEqual(resolveMarket(def({ stat: "red_card" }), match({ status: "finished" }), []), { kind: "open" });
  });
  it("NFL overtime locks YES when OT starts, NO at full time", () => {
    const d = def({ stat: "overtime" });
    assert.deepEqual(resolveMarket(d, match({ wentToOvertime: true }), []), { kind: "locked", outcome: "yes" });
    assert.deepEqual(resolveMarket(d, match({ wentToOvertime: null }), []), { kind: "open" });
    assert.deepEqual(resolveMarket(d, match({ status: "finished", wentToOvertime: false }), []), { kind: "final", outcome: "no" });
  });
});

describe("decideSettlement — the 10-minute safety window", () => {
  const locked = { kind: "locked" as const, outcome: "yes" as const };
  const t0 = 1_000_000;

  it("starts the clock the first time a lock is seen", () => {
    assert.deepEqual(decideSettlement(locked, null, [], t0), { action: "hold", pending: { outcome: "yes", since: t0 } });
  });
  it("pays only once the lock has held for the full window", () => {
    const pending = { outcome: "yes" as const, since: t0 };
    assert.deepEqual(decideSettlement(locked, pending, [], t0 + 9 * MIN), { action: "hold", pending });
    assert.deepEqual(decideSettlement(locked, pending, [], t0 + SAFETY_WINDOW_MS), { action: "settle", outcome: "yes" });
  });
  it("waits while a VAR check is open, and keeps the clock", () => {
    const pending = { outcome: "yes" as const, since: t0 };
    const events = [ev("var", t0 + 2 * MIN)];
    assert.equal(reviewOpen(events), true);
    assert.deepEqual(decideSettlement(locked, pending, events, t0 + 11 * MIN), { action: "hold", pending });
    const closed = [...events, ev("var_end", t0 + 3 * MIN)];
    assert.equal(reviewOpen(closed), false);
    assert.deepEqual(decideSettlement(locked, pending, closed, t0 + 11 * MIN), { action: "settle", outcome: "yes" });
  });
  it("a goal VAR takes away inside the window never settles", () => {
    // Over 2.5 locked at 3 goals, then the third goal is disallowed: the
    // market reads open again, so the pending lock is thrown away.
    const pending = { outcome: "yes" as const, since: t0 };
    const reopened = resolveMarket(def({ stat: "total_goals", comparison: "over", threshold: 2.5 }), match({ homeScore: 2, awayScore: 0 }), []);
    assert.deepEqual(decideSettlement(reopened, pending, [], t0 + 12 * MIN), { action: "hold", pending: null });
  });
  it("a correction inside the window restarts the clock", () => {
    const pending = { outcome: "yes" as const, since: t0 };
    const events = [ev("action_amend", t0 + 5 * MIN)];
    const now = t0 + 11 * MIN;
    assert.deepEqual(decideSettlement(locked, pending, events, now), { action: "hold", pending: { outcome: "yes", since: now } });
  });
  it("an NFL replay review holds settlement too", () => {
    const events = [ev("instant_replay", t0)];
    assert.deepEqual(decideSettlement({ kind: "final", outcome: "no" }, null, events, t0 + MIN), { action: "hold", pending: null });
  });
  it("whistle results pay immediately; cancellations refund immediately", () => {
    assert.deepEqual(decideSettlement({ kind: "final", outcome: "no" }, null, [], t0), { action: "settle", outcome: "no" });
    assert.deepEqual(decideSettlement({ kind: "void" }, null, [ev("var")], t0), { action: "settle", outcome: "void" });
  });
});

describe("resolveMarket — anytime goalscorer (Premier League)", () => {
  const scorer = def({ stat: "anytime_scorer", player: "Isak", playerId: 101, team: "away" });
  const goal = (playerId: number, goalType = "Shot", at = 0) => eventFact("goal", new Date(at).toISOString(), { PlayerId: playerId, GoalType: goalType });

  it("locks Yes the moment the player scores, final at the whistle", () => {
    assert.deepEqual(resolveMarket(scorer, match(), [goal(101)]), { kind: "locked", outcome: "yes" });
    assert.deepEqual(resolveMarket(scorer, match({ status: "finished" }), [goal(101)]), { kind: "final", outcome: "yes" });
  });

  it("ignores own goals and other players' goals", () => {
    assert.deepEqual(resolveMarket(scorer, match(), [goal(101, "Own"), goal(101, "OwnGoal"), goal(202)]), { kind: "open" });
  });

  it("is No at full time without their goal — even if they never played", () => {
    assert.deepEqual(resolveMarket(scorer, match({ status: "finished" }), [goal(202)]), { kind: "final", outcome: "no" });
    assert.deepEqual(resolveMarket(scorer, match({ status: "finished" }), []), { kind: "final", outcome: "no" });
  });

  it("counts duplicate rows of the same goal once (any one is enough)", () => {
    assert.deepEqual(resolveMarket(scorer, match({ status: "finished" }), [goal(101), goal(101)]), { kind: "final", outcome: "yes" });
  });

  it("leaves rooms without a player id (older rooms) to an admin", () => {
    assert.deepEqual(resolveMarket(def({ stat: "anytime_scorer", player: "Isak", team: "away" }), match({ status: "finished" }), []), { kind: "manual" });
  });

  it("refunds if the match is cancelled", () => {
    assert.deepEqual(resolveMarket(scorer, match({ status: "cancelled" }), [goal(101)]), { kind: "void" });
  });
});
