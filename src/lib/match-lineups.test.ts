import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collapseEvents } from "./match-feed.ts";
import { buildLineups, playerNames, type StoredLineupTeam } from "./match-lineups.ts";
import type { EventRow } from "./match-timeline.ts";

// Shapes taken from the real TxLINE log of Fulham v Manchester Utd
// (fixture 18146847), trimmed to a few players.
let n = 0;
const row = (action: string, payload: Record<string, unknown>, minute: number | null = null): EventRow => ({
  id: `r${++n}`,
  action,
  minute,
  payload,
  occurredAt: new Date(Date.UTC(2026, 8, 20, 15, 30) + n * 1000).toISOString(),
});

const P = (id: number, surname: string, number: string, pos: "GK" | "DEF" | "MID" | "FWD", starter: boolean) => ({
  id,
  name: surname,
  surname,
  number,
  pos,
  starter,
});
const teams: StoredLineupTeam[] = [
  {
    name: "Fulham",
    players: [
      P(1, "Leno", "1", "GK", true),
      P(404882, "Castagne", "21", "DEF", true),
      P(2, "Robinson", "33", "DEF", true),
      P(434991, "Iwobi", "17", "MID", true),
      P(10105236, "King", "24", "MID", true),
      P(10093612, "Garcia Torres", "7", "FWD", true),
      P(10180004, "Palacios Perez", "8", "MID", false),
      P(10095230, "Muniz Carvalho", "9", "FWD", false),
      P(3, "Lecomte", "23", "GK", false),
    ],
  },
  {
    name: "Manchester Utd",
    players: [
      P(4, "Lammens", "1", "GK", true),
      P(1103557, "Martinez", "6", "DEF", true),
      P(1018289, "Carneiro Da Cunha", "10", "FWD", true),
    ],
  },
];

describe("collapseEvents", () => {
  it("folds a goal's first report, confirmation and scorer into one row, at the first report's time", () => {
    const rows = [
      row("goal", { _eid: 711, _clock: 3740, _side: "home" }, 63),
      row("goal", { _eid: 711, _clock: 3740, GoalType: "Own" }, 63),
      row("goal", { _eid: 711, _clock: 3740, GoalType: "Own", PlayerId: 1103557 }, 63),
    ];
    const out = collapseEvents(rows);
    assert.equal(out.length, 1);
    assert.equal(out[0].occurredAt, rows[0].occurredAt);
    assert.deepEqual(
      { t: out[0].payload?.GoalType, p: out[0].payload?.PlayerId, s: out[0].payload?._side },
      { t: "Own", p: 1103557, s: "home" },
    );
  });

  it("applies an amend to the event at the clock it names", () => {
    const out = collapseEvents([
      row("yellow_card", { _eid: 570, _clock: 2944 }, 50),
      row("action_amend", { _eid: 572, Action: "yellow_card", New: { Clock: { Seconds: 2944 }, PlayerId: 404882 }, Previous: { Clock: { Seconds: 2944 } } }),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].payload?.PlayerId, 404882);
  });

  it("drops a discarded event and leaves rows without an id alone", () => {
    const out = collapseEvents([
      row("substitution", { _eid: 835, _clock: 4561 }, 77),
      row("action_discarded", { _eid: 835 }),
      row("goal", { GoalType: "Shot" }, 12),
    ]);
    assert.deepEqual(
      out.map((r) => r.action),
      ["goal"],
    );
  });
});

describe("buildLineups", () => {
  it("is null before the line-ups are out", () => {
    assert.equal(buildLineups([row("kickoff", {})], "Fulham", "Manchester Utd"), null);
  });

  it("builds the shape and formation from the lines, and puts home and away the right way round", () => {
    const l = buildLineups([row("lineups", { teams: [teams[1], teams[0]] })], "Fulham", "Manchester Utd")!;
    assert.equal(l.home.name, "Fulham");
    assert.equal(l.home.formation, "2-2-1");
    assert.deepEqual(
      l.home.lines.map((line) => line.map((p) => p.surname)),
      [["Leno"], ["Castagne", "Robinson"], ["Iwobi", "King"], ["Garcia Torres"]],
    );
    assert.deepEqual(
      l.home.bench.map((p) => p.surname),
      ["Palacios Perez", "Muniz Carvalho", "Lecomte"],
    );
  });

  it("marks goals, own goals, cards and substitutions — ignoring a substitution the wrong way round", () => {
    const rows = collapseEvents([
      row("lineups", { _eid: 11, teams }),
      row("goal", { _eid: 711, _clock: 3740, GoalType: "Own", PlayerId: 1103557 }, 63),
      row("yellow_card", { _eid: 507, _clock: 2668, PlayerId: 10105236 }, 45),
      // The feed's first amend had Iwobi coming on for Palacios — impossible,
      // Iwobi started. Its correction (on the next substitution) is the real one.
      row("substitution", { _eid: 766, _clock: 4198 }, 70),
      row("action_amend", { Action: "substitution", New: { Clock: { Seconds: 4198 }, PlayerInId: 434991, PlayerOutId: 10180004 }, Previous: { Clock: { Seconds: 4198 } } }),
      row("substitution", { _eid: 802, _clock: 4435 }, 74),
      row("action_amend", { Action: "substitution", New: { Clock: { Seconds: 4198 }, PlayerInId: 10180004, PlayerOutId: 434991 }, Previous: { Clock: { Seconds: 4435 } } }),
      row("goal", { _eid: 962, _clock: 5316, GoalType: "Shot", PlayerId: 1018289 }, 89),
    ]);
    const l = buildLineups(rows, "Fulham", "Manchester Utd")!;
    const all = [...l.home.lines.flat(), ...l.home.bench, ...l.away.lines.flat()];
    const by = (s: string) => all.find((p) => p.surname === s)!;
    assert.equal(by("Martinez").ownGoals, 1);
    assert.equal(by("Carneiro Da Cunha").goals, 1);
    assert.equal(by("King").yellow, 1);
    assert.equal(by("Iwobi").off, 70);
    assert.equal(by("Palacios Perez").on, 70);
    assert.equal(l.home.bench[0].surname, "Palacios Perez");
  });

  it("names players by id for the timeline and feed", () => {
    assert.equal(playerNames([row("lineups", { teams })])[1018289], "Carneiro Da Cunha");
  });
});
