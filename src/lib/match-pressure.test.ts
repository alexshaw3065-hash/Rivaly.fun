import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { feedClock, matchStory, pressureAlerts } from "./match-pressure.ts";
import type { EventRow } from "./match-timeline.ts";

let n = 0;
const ev = (action: string, side: "home" | "away", clock: number): EventRow => ({
  id: String(n++),
  action,
  minute: Math.floor(clock / 60) + 1,
  payload: { _side: side, _clock: clock },
  occurredAt: new Date(Date.UTC(2026, 8, 20, 15, 0, clock)).toISOString(),
});

describe("pressureAlerts", () => {
  it("fires when one side piles on the danger inside three minutes", () => {
    const rows = [0, 20, 40, 60, 80].map((c) => ev("high_danger_possession", "away", 600 + c));
    const alerts = pressureAlerts(rows);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].side, "away");
    assert.equal(alerts[0].minute, 12);
    assert.equal(alerts[0].attacks, 5);
  });

  it("stays quiet for scattered attacks, and doesn't repeat inside the cooldown", () => {
    const scattered = [0, 300, 600, 900].map((c) => ev("danger_possession", "home", c));
    assert.equal(pressureAlerts(scattered).length, 0);
    const spell = [0, 15, 30, 45, 60, 75, 90, 105].map((c) => ev("high_danger_possession", "home", 1200 + c));
    assert.equal(pressureAlerts(spell).length, 1);
  });

  it("reads the feed's clock", () => {
    assert.equal(feedClock([ev("safe_possession", "home", 10), ev("safe_possession", "away", 900)]), 900);
  });
});

describe("matchStory", () => {
  const ctx = { home: "Fulham", away: "Man Utd", homeScore: 1, awayScore: 1, finished: true };

  it("needs enough of a match to tell", () => {
    assert.equal(matchStory([ev("danger_possession", "home", 60)], ctx), null);
  });

  it("finds a spell of control and calls out the side that dominated without winning", () => {
    const rows: EventRow[] = [];
    for (let m = 0; m < 90; m++) rows.push(ev("attack_possession", m < 20 ? "home" : "away", m * 60 + 5));
    for (let m = 40; m < 80; m++) rows.push(ev("high_danger_possession", "away", m * 60 + 30));
    const story = matchStory(rows, ctx)!;
    assert.ok(story.share.away > 70);
    assert.match(story.headline, /^Man Utd had \d+% of the pressure but couldn't find a winner\.$/);
    assert.ok(story.beats.some((b) => b.kind === "spell" && b.side === "away"));
  });
});
