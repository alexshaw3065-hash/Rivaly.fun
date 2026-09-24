import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchStats } from "./match-stats.ts";
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
  it("shows nothing before kick-off", () => {
    assert.deepEqual(matchStats({ ...base, status: "scheduled" }, []), []);
  });

  it("uses the match row for goals, corners and cards", () => {
    const rows = matchStats(
      { ...base, status: "finished", homeScore: 1, awayScore: 0, homeCorners: 8, awayCorners: 0, homeYellowCards: 0, awayYellowCards: 1, homeRedCards: 0, awayRedCards: 0 },
      [],
    );
    assert.deepEqual(
      rows.map((r) => [r.key, r.home, r.away]),
      [
        ["goals", 1, 0],
        ["corners", 8, 0],
        ["yellow", 0, 1],
        ["red", 0, 0],
      ],
    );
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

  it("leaves out stats the feed didn't give", () => {
    const keys = matchStats({ ...base, status: "live", homeScore: 0, awayScore: 0 }, []).map((r) => r.key);
    assert.deepEqual(keys, ["goals"]);
  });
});
