import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchStats, momentum, possession } from "./match-stats.ts";
import type { EventRow } from "./match-timeline.ts";
import type { Match } from "./types.ts";

const base = {
  id: "m",
  homeTeam: "Portugal",
  awayTeam: "Wales",
  competition: "Nations League",
  kickoffAt: "2026-09-24T19:00:00Z",
} as unknown as Match;

let n = 0;
const ev = (action: string, payload: Record<string, unknown>): EventRow => ({
  id: String(n++),
  action,
  minute: 10,
  payload,
  occurredAt: "2026-09-24T19:10:00Z",
});

describe("matchStats", () => {
  it("shows every row at zero before kick-off", () => {
    const rows = matchStats({ ...base, status: "scheduled" }, []);
    assert.deepEqual(
      rows.map((r) => r.key),
      ["possession", "shots", "on-target", "chances", "corners", "fouls", "offsides", "yellow", "red"],
    );
    assert.ok(rows.every((r) => r.home === 0 && r.away === 0));
  });

  it("uses the feed's running totals for corners and cards", () => {
    const rows = Object.fromEntries(
      matchStats(
        { ...base, status: "finished", homeScore: 1, awayScore: 0, homeCorners: 8, awayCorners: 0, homeYellowCards: 0, awayYellowCards: 1, homeRedCards: 0, awayRedCards: 0 },
        [ev("corner", { _side: "away" })],
      ).map((r) => [r.key, [r.home, r.away]]),
    );
    assert.deepEqual(rows.corners, [8, 0]);
    assert.deepEqual(rows.yellow, [0, 1]);
  });

  it("counts shots, on target, fouls and offsides from the events", () => {
    const events = [
      ev("shot", { _side: "home", Outcome: "OnTarget" }),
      ev("shot", { _side: "home", Outcome: "OffTarget" }),
      ev("shot", { _side: "away", Outcome: "Blocked" }),
      ev("free_kick", { _side: "home", FreeKickType: "Attack" }), // away fouled
      ev("free_kick", { _side: "away", FreeKickType: "Offside" }), // home offside
      ev("shot", { Outcome: "OnTarget" }), // no team: not counted
    ];
    const rows = Object.fromEntries(matchStats({ ...base, status: "live", homeScore: 0, awayScore: 0 }, events).map((r) => [r.key, [r.home, r.away]]));
    assert.deepEqual(rows.shots, [2, 1]);
    assert.deepEqual(rows["on-target"], [1, 0]);
    assert.deepEqual(rows.fouls, [0, 1]);
    assert.deepEqual(rows.offsides, [1, 0]);
  });

  it("counts big chances from the feed's possible-goal flag", () => {
    const rows = Object.fromEntries(
      matchStats({ ...base, status: "live" }, [ev("possible", { _side: "away", Goal: true }), ev("possible", { _side: "away", Goal: false })]).map((r) => [r.key, [r.home, r.away]]),
    );
    assert.deepEqual(rows.chances, [0, 1]);
  });
});

describe("possession", () => {
  it("weights each stretch by the clock, and caps breaks", () => {
    const p = possession([
      ev("safe_possession", { _poss: "home", _clock: 0 }),
      ev("attack_possession", { _poss: "away", _clock: 60 }),
      ev("safe_possession", { _poss: "home", _clock: 80 }),
      // a 20-minute gap (half-time) counts as two minutes, not twenty
      ev("safe_possession", { _poss: "away", _clock: 1280 }),
      ev("safe_possession", { _poss: "away", _clock: 1300 }),
    ]);
    // home 60 + 120, away 20 + 20
    assert.deepEqual(p, { home: 82, away: 18 });
  });

  it("is 0 / 0 before anyone has the ball", () => {
    assert.deepEqual(possession([]), { home: 0, away: 0 });
  });
});

describe("momentum", () => {
  it("leans toward the side attacking, minute by minute, with goals marked", () => {
    const m = momentum([
      ev("danger_possession", { _side: "home", _clock: 30 }),
      ev("attack_possession", { _side: "away", _clock: 70 }),
      ev("high_danger_possession", { _side: "away", _clock: 100 }),
      ev("goal", { _side: "away", _clock: 110 }),
    ]);
    assert.deepEqual(m.bars, [
      { minute: 1, value: 2.5 },
      { minute: 2, value: -5 },
    ]);
    assert.deepEqual(m.marks, [{ minute: 2, side: "away", kind: "goal" }]);
  });
});
