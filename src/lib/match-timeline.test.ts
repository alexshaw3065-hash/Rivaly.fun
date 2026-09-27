import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, liveMinute, minuteLabel, scoreAt, scoreAtMinute, wallToMinute, type EventRow } from "./match-timeline.ts";

const KO = Date.parse("2026-09-24T19:00:00Z");
const min = (m: number) => KO + m * 60_000;
const row = (id: string, action: string, minute: number | null, at: number, payload: Record<string, unknown> = {}): EventRow => ({
  id,
  action,
  minute,
  payload,
  occurredAt: new Date(at).toISOString(),
});

describe("wallToMinute", () => {
  it("counts straight through the first half", () => {
    assert.equal(wallToMinute(min(30), KO, null), 30);
  });
  it("freezes at 45' through the half-time break, then carries on", () => {
    const ht = min(47); // 45 + stoppage
    assert.equal(wallToMinute(min(55), KO, ht), 47);
    assert.equal(wallToMinute(min(47 + 15 + 10), KO, ht), 57);
  });
});

describe("buildTimeline", () => {
  const rows = [
    row("k", "kickoff", null, min(0)),
    row("y", "yellow_card", 23, min(23), { PlayerId: 1 }),
    row("g1", "goal", 31, min(31), { GoalType: "Head", _home: 1, _away: 0 }),
    row("sub", "substitution", 60, min(80)), // skipped
    row("ht", "halftime_finalised", null, min(47)),
    row("g2", "goal", 70, min(88), { _home: 1, _away: 1 }),
    row("r", "red_card", 82, min(100), { Type: "SecondYellow", _side: "away" }),
    row("ft", "game_finalised", null, min(112)),
  ];
  const t = buildTimeline({ sport: "soccer", kickoffAt: KO, rows, messageTimes: [min(31.2), min(31.5), min(32.9), min(40), min(88.5)] });

  it("keeps only the moments that decide a match (no yellow cards), in match order", () => {
    assert.deepEqual(
      t.events.map((e) => e.kind),
      ["kickoff", "goal", "halftime", "goal", "red", "fulltime"],
    );
  });
  it("rewinds the scoreboard to any minute", () => {
    assert.deepEqual(scoreAtMinute(t, 10), { home: 0, away: 0 });
    assert.deepEqual(scoreAtMinute(t, 31), { home: 1, away: 0 });
    assert.deepEqual(scoreAtMinute(t, 90), { home: 1, away: 1 });
  });
  it("says who scored from the score change, and describes the goal", () => {
    const [g1, g2] = t.events.filter((e) => e.kind === "goal");
    assert.equal(g1.side, "home");
    assert.equal(g1.detail, "Header");
    assert.equal(g2.side, "away");
  });
  it("describes the card and keeps the team the feed gave", () => {
    const red = t.events.find((e) => e.kind === "red")!;
    assert.equal(red.detail, "Second yellow");
    assert.equal(red.side, "away");
  });
  it("counts the room's reaction in the two minutes after", () => {
    assert.equal(t.events.find((e) => e.id === "g1")!.reactions, 3);
  });
  it("knows the score at any minute", () => {
    assert.deepEqual(scoreAt(t.events, 10), { home: 0, away: 0 });
    assert.deepEqual(scoreAt(t.events, 50), { home: 1, away: 0 });
    assert.deepEqual(scoreAt(t.events, 90), { home: 1, away: 1 });
  });
  it("puts the room's chat on the track", () => {
    assert.equal(t.heat.reduce((a, b) => a + b, 0), 5);
  });
  it("never runs the live playhead past the end", () => {
    assert.equal(liveMinute(t, min(500)), t.domain);
  });
});

describe("scoreboard rewind", () => {
  it("counts a goal the feed sent without a score", () => {
    const t = buildTimeline({
      sport: "soccer",
      kickoffAt: KO,
      rows: [
        row("k", "kickoff", null, min(0)),
        row("g1", "goal", 12, min(12), { _side: "home" }),
        row("g2", "goal", 40, min(40), { _side: "away" }),
        row("g3", "goal", 60, min(75), { _side: "home" }),
      ],
      messageTimes: [],
    });
    assert.deepEqual(scoreAtMinute(t, 30), { home: 1, away: 0 });
    assert.deepEqual(scoreAtMinute(t, 45), { home: 1, away: 1 });
    assert.deepEqual(scoreAtMinute(t, 89), { home: 2, away: 1 });
  });
  it("labels the playhead in the sport's own time", () => {
    assert.equal(minuteLabel("soccer", 30.6), "30’");
    assert.equal(minuteLabel("nfl", 0), "Q1 15:00");
    assert.equal(minuteLabel("nfl", 22.5), "Q2 7:30");
    assert.equal(minuteLabel("nfl", 60), "Q4 0:00");
  });
});

