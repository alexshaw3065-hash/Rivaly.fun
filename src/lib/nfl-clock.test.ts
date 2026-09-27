import { test } from "node:test";
import assert from "node:assert/strict";
import { newNflClock, nflClockLabel, nflGameMinute, nflTick } from "./nfl-clock.ts";
import { matchMoment } from "./match-event-label.ts";
import { buildTimeline, type EventRow } from "./match-timeline.ts";

test("the quarter advances when the countdown jumps back to 15:00", () => {
  const c = newNflClock();
  assert.deepEqual(nflTick(c, { _clock: 900 }), { quarter: 1, clock: 900, newQuarter: false });
  nflTick(c, { _clock: 300 });
  nflTick(c, { _clock: 0 });
  assert.deepEqual(nflTick(c, { _clock: 900 }), { quarter: 2, clock: 900, newQuarter: true });
  // A small upward correction isn't a new quarter.
  nflTick(c, { _clock: 500 });
  assert.equal(nflTick(c, { _clock: 560 })?.quarter, 2);
  assert.equal(nflTick(c, null), null);
});

test("game minute and label", () => {
  assert.equal(nflGameMinute(1, 900), 0);
  assert.equal(nflGameMinute(2, 450), 22.5);
  assert.equal(nflClockLabel(2, 506), "Q2 8:26");
  assert.equal(nflClockLabel(5, 190), "OT 3:10");
});

test("NFL chat: kickoff, scores, halftime, final — nothing else", () => {
  const ctx = { sport: "nfl" as const, nfl: newNflClock(), teams: { home: "SF", away: "ARI" } };
  assert.equal(matchMoment("kickoff", null, { Type: "regular", _clock: 900 }, ctx)?.label, "Kickoff");
  // Early-warning flags never reach the chat.
  assert.equal(matchMoment("possible", null, { Penalty: true, _clock: 614 }, ctx), null);
  assert.equal(matchMoment("possible", null, { BigPlay: true, Touchdown: true, _clock: 600 }, ctx), null);
  assert.equal(matchMoment("touchdown", null, { _side: "home", _clock: 506 }, ctx)?.label, "🏈 TOUCHDOWN · SF · Q1 8:26");
  // A kick after a score (clock not at 15:00) says nothing.
  assert.equal(matchMoment("kickoff", null, { Type: "regular", _clock: 506 }, ctx), null);
  // Q1 → Q2 is not a line; Q2 → Q3 is halftime.
  matchMoment("status", null, { _clock: 0 }, ctx);
  assert.equal(matchMoment("status", null, { _clock: 900 }, ctx), null);
  matchMoment("status", null, { _clock: 0 }, ctx);
  assert.equal(matchMoment("status", null, { _clock: 900 }, ctx)?.label, "Halftime");
  assert.equal(matchMoment("game_finalised", null, {}, ctx)?.label, "Final");
});

test("soccer chat: kick-off, goals, half-time, full time — nothing else", () => {
  const ctx = { teams: { home: "ARS", away: "LEE" } };
  assert.equal(matchMoment("kickoff", null, { _clock: 0 }, ctx)?.label, "Kick-off");
  assert.equal(matchMoment("kickoff", null, { _clock: 2700 }, ctx), null);
  assert.equal(matchMoment("goal", 23, {}, ctx)?.label, "⚽ GOAL 23'");
  assert.equal(matchMoment("halftime_finalised", null, {}, ctx)?.label, "Half-time");
  assert.equal(matchMoment("game_finalised", null, {}, ctx)?.label, "Full time");
  for (const quiet of ["possible", "yellow_card", "red_card", "var", "var_end", "penalty", "additional_time"]) {
    assert.equal(matchMoment(quiet, 50, { Penalty: true, Minutes: 3 }, ctx), null, quiet);
  }
});

test("the NFL timeline runs on game time, Q1 to Q4", () => {
  const KO = Date.UTC(2026, 8, 27, 20, 5);
  const row = (i: number, action: string, payload: Record<string, unknown>, mins: number): EventRow => ({
    id: String(i),
    action,
    minute: null,
    payload: { _eid: i, ...payload },
    occurredAt: new Date(KO + mins * 60_000).toISOString(),
  });
  const t = buildTimeline({
    sport: "nfl",
    kickoffAt: KO,
    rows: [
      row(1, "kickoff", { Type: "regular", _clock: 900 }, 0),
      row(2, "touchdown", { _side: "home", _clock: 506, _home: 7, _away: 0 }, 17),
      row(3, "status", { _clock: 0 }, 40),
      row(4, "status", { _clock: 900 }, 42),
      row(5, "touchdown", { _side: "home", _clock: 673, _home: 14, _away: 0 }, 50),
    ],
    messageTimes: [],
  });
  assert.equal(t.domain, 60);
  const tds = t.events.filter((e) => e.title === "Touchdown");
  assert.deepEqual(tds.map((e) => e.clock), ["Q1 8:26", "Q2 11:13"]);
  assert.ok(Math.abs(tds[1].minute - (15 + 227 / 60)) < 1e-9);
  assert.equal(t.nfl?.quarter, 2);
});
