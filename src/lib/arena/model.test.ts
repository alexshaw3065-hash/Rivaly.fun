import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ago,
  displayName,
  decidedBy,
  appendPage,
  cursorOf,
  momentHeadline,
  newerThan,
  newItemsLabel,
  sideShare,
  toItems,
  toggleReaction,
  type ArenaItem,
  type FeedRow,
  type MomentItem,
  type MatchRoom,
} from "./model.ts";

const match = { id: "m1", home: "Arsenal", away: "Chelsea", competition: "Premier League", sportId: 1, status: "live", homeScore: 1, awayScore: 0, kickoffAt: "2026-09-26T14:00:00Z" };
const moment = (id: string, action: string, payload: MomentItem["payload"] = {}): MomentItem => ({
  kind: "moment", id, at: "2026-09-26T14:30:00Z", action, minute: 30, payload, match, rooms: 0, takes: 0, reactions: {}, mine: [],
});

describe("toItems", () => {
  it("types known rows and skips unknown kinds or empty data", () => {
    const rows: FeedRow[] = [
      { kind: "moment", id: "a", at: "2026-09-26T14:30:00Z", data: { action: "goal", payload: {}, match, reactions: { "🔥": 2 }, mine: ["🔥", "💩"] } },
      { kind: "poll", id: "b", at: "2026-09-26T14:29:00Z", data: {} },
      { kind: "post", id: "c", at: "2026-09-26T14:28:00Z", data: null },
    ];
    const items = toItems(rows);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "moment");
    assert.deepEqual(items[0].mine, ["🔥"]);
    assert.equal(items[0].reactions["🔥"], 2);
  });
});

describe("toggleReaction", () => {
  it("adds, then removes, and drops zero counts", () => {
    const a = toggleReaction(moment("x", "goal"), "😂");
    assert.deepEqual(a.mine, ["😂"]);
    assert.equal(a.reactions["😂"], 1);
    const b = toggleReaction(a, "😂");
    assert.deepEqual(b.mine, []);
    assert.equal("😂" in b.reactions, false);
  });
  it("keeps other people's counts", () => {
    const item = { ...moment("x", "goal"), reactions: { "🔥": 5 } };
    assert.equal(toggleReaction(item, "🔥").reactions["🔥"], 6);
  });
});

describe("paging", () => {
  const a = moment("a", "goal");
  const b = moment("b", "goal");
  const c = moment("c", "goal");
  it("cursor is the last item", () => {
    assert.deepEqual(cursorOf([a, b]), { at: b.at, id: "b" });
    assert.equal(cursorOf([]), null);
  });
  it("appendPage drops repeats", () => {
    assert.deepEqual(appendPage([a, b], [b, c]).map((i) => i.id), ["a", "b", "c"]);
  });
  it("a post and its receipt with the same id are different items", () => {
    const post = { ...a, kind: "post" } as unknown as ArenaItem;
    const receipt = { ...a, kind: "receipt" } as unknown as ArenaItem;
    assert.equal(newerThan([post], [receipt]).length, 1);
  });
});

describe("newItemsLabel", () => {
  it("counts goals and touchdowns", () => {
    assert.equal(newItemsLabel([moment("a", "var_end")]), "1 new");
    assert.equal(newItemsLabel([moment("a", "goal"), moment("b", "var_end")]), "2 new · 1 goal");
    assert.equal(newItemsLabel([moment("a", "goal"), moment("b", "goal")]), "2 new · 2 goals");
    assert.equal(newItemsLabel([moment("a", "touchdown")]), "1 new · 1 touchdown");
  });
});

describe("momentHeadline", () => {
  it("names the scorer from the line-ups and the team", () => {
    const h = momentHeadline(moment("a", "goal", { side: "home", playerId: 7 }), { 7: "Saka" });
    assert.deepEqual(h, { title: "Goal", tone: "goal", detail: "Saka · Arsenal" });
  });
  it("reads VAR outcomes and second yellows", () => {
    assert.equal(momentHeadline(moment("a", "var_end", { outcome: "Overturned" })).title, "VAR — overturned");
    assert.equal(momentHeadline(moment("a", "red_card", { type: "SecondYellow", side: "away" })).detail, "Chelsea");
  });
  it("handles NFL scoring", () => {
    assert.equal(momentHeadline(moment("a", "touchdown", { side: "away", type: "rush" })).detail, "Chelsea · rush");
    assert.equal(momentHeadline(moment("a", "field_goal")).title, "Field goal");
  });
});

describe("helpers", () => {
  it("sideShare is even on an empty pool", () => {
    assert.equal(sideShare({ yes: 0, no: 0 }, "yes"), 0.5);
    assert.equal(sideShare({ yes: 300, no: 100 }, "no"), 0.25);
  });
  it("ago", () => {
    const now = Date.parse("2026-09-26T12:00:00Z");
    assert.equal(ago("2026-09-26T11:59:30Z", now), "now");
    assert.equal(ago("2026-09-26T11:45:00Z", now), "15m");
    assert.equal(ago("2026-09-26T09:00:00Z", now), "3h");
    assert.equal(ago("2026-09-24T12:00:00Z", now), "2d");
  });
});

describe("displayName", () => {
  it("falls back to the handle when the name is an id", () => {
    assert.equal(displayName("92d50378-841c-4202-b777-6f14a551b17a", "uuyj"), "@uuyj");
    assert.equal(displayName("Tunde", "tunde"), "Tunde");
    assert.equal(displayName(null, null), "A rival");
  });
});

describe("decidedBy", () => {
  const room = (id: string, def: MatchRoom["def"], status = "live"): MatchRoom => ({ id, prediction: id, status, outcome: null, pool: 0, participants: 0, def });
  const over25 = room("over", { stat: "total_goals", comparison: "over", threshold: 2.5 } as MatchRoom["def"]);
  const btts = room("btts", { stat: "both_score" } as MatchRoom["def"]);
  const winner = room("win", { stat: "winner", outcome: "home" } as MatchRoom["def"]);
  const htOver = room("ht", { stat: "halftime_total_goals", comparison: "over", threshold: 0.5 } as MatchRoom["def"]);
  const goal = (home: number, away: number, side: "home" | "away", minute = 60) => ({ ...moment("g", "goal", { home, away, side }), minute });

  it("the third goal decides Over 2.5, and not before", () => {
    assert.deepEqual(decidedBy(goal(2, 1, "away"), [over25]).map((d) => [d.room.id, d.outcome]), [["over", "yes"]]);
    assert.equal(decidedBy(goal(2, 0, "home"), [over25]).length, 0);
    assert.equal(decidedBy(goal(3, 1, "home"), [over25]).length, 0); // already decided at 2–1
  });
  it("both teams to score locks on the second team's first goal", () => {
    assert.equal(decidedBy(goal(1, 1, "away"), [btts])[0]?.outcome, "yes");
    assert.equal(decidedBy(goal(2, 0, "home"), [btts]).length, 0);
  });
  it("full time decides the winner", () => {
    const ft = { ...moment("f", "game_finalised", { home: 2, away: 1 }), minute: null };
    assert.equal(decidedBy(ft, [winner])[0]?.outcome, "yes");
    assert.equal(decidedBy(goal(2, 1, "home"), [winner]).length, 0);
  });
  it("ignores first-half markets on second-half goals", () => {
    assert.equal(decidedBy(goal(1, 0, "home", 70), [htOver]).length, 0);
    assert.equal(decidedBy(goal(1, 0, "home", 20), [htOver])[0]?.outcome, "yes");
  });
  it("skips cancelled rooms and custom ones", () => {
    assert.equal(decidedBy(goal(2, 1, "away"), [{ ...over25, status: "cancelled" }, room("custom", null)]).length, 0);
  });
});
