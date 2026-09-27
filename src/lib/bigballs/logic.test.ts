import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { confirmFinal, CONFIRM_MS, goalsBetween, goalsWithdrawn, MATCH_WINDOW_MS, MAX_MS, nextDelay, ticksStillNeeded } from "./logic.ts";

describe("goals from score changes", () => {
  it("one goal", () => {
    assert.deepEqual(goalsBetween({ home: 0, away: 0 }, { home: 1, away: 0 }), [{ seq: 1, side: "home", home: 1, away: 0 }]);
  });
  it("two goals in one slow tick keep an exact running score", () => {
    assert.deepEqual(goalsBetween({ home: 1, away: 0 }, { home: 2, away: 1 }), [
      { seq: 2, side: "home", home: 2, away: 0 },
      { seq: 3, side: "away", home: 2, away: 1 },
    ]);
  });
  it("no change, no goals", () => {
    assert.deepEqual(goalsBetween({ home: 2, away: 2 }, { home: 2, away: 2 }), []);
  });
  it("a goal taken back is withdrawn by its number", () => {
    assert.deepEqual(goalsWithdrawn({ home: 2, away: 1 }, { home: 1, away: 1 }), [3]);
    assert.deepEqual(goalsWithdrawn({ home: 1, away: 1 }, { home: 1, away: 1 }), []);
  });
});

describe("full time only counts once it holds", () => {
  const t0 = 1_000_000;
  it("first sighting starts the wait", () => {
    const r = confirmFinal(undefined, { status: "finished", home: 2, away: 1 }, t0);
    assert.equal(r.confirmed, false);
    assert.deepEqual(r.pending, { home: 2, away: 1, since: t0 });
  });
  it("same score after the wait confirms", () => {
    const r = confirmFinal({ home: 2, away: 1, since: t0 }, { status: "finished", home: 2, away: 1 }, t0 + CONFIRM_MS);
    assert.equal(r.confirmed, true);
  });
  it("a changed score restarts the wait", () => {
    const r = confirmFinal({ home: 2, away: 1, since: t0 }, { status: "finished", home: 2, away: 2 }, t0 + CONFIRM_MS);
    assert.equal(r.confirmed, false);
    assert.equal(r.pending?.since, t0 + CONFIRM_MS);
  });
  it("going back to in-progress clears it", () => {
    const r = confirmFinal({ home: 2, away: 1, since: t0 }, { status: "in_progress", home: 2, away: 1 }, t0 + CONFIRM_MS);
    assert.equal(r.confirmed, false);
    assert.equal(r.pending, undefined);
  });
});

describe("budget governor", () => {
  const now = Date.UTC(2026, 9, 10, 12, 0);
  const eod = Date.UTC(2026, 9, 11);
  it("overlapping matches in one league share polls", () => {
    const n = ticksStillNeeded(
      [
        { group: "laliga:2026-10-10", kickoff: now },
        { group: "laliga:2026-10-10", kickoff: now },
      ],
      now,
      eod,
    );
    assert.equal(n, MATCH_WINDOW_MS / 60_000);
  });
  it("60s when the day can afford it, 45s when urgent and affordable", () => {
    assert.equal(nextDelay({ usedToday: 50, ticksNeeded: 135, urgent: false }), 60_000);
    assert.equal(nextDelay({ usedToday: 50, ticksNeeded: 135, urgent: true }), 45_000);
  });
  it("stretches when the calls left wouldn't last, never past 5 minutes", () => {
    assert.equal(nextDelay({ usedToday: 370, ticksNeeded: 200, urgent: false }), 120_000);
    assert.equal(nextDelay({ usedToday: 470, ticksNeeded: 200, urgent: false }), MAX_MS);
  });
});
