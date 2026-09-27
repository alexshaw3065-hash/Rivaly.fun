import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, groupByDay, type AppNotification } from "./notifications-model.ts";

const base = (over: Partial<AppNotification>): AppNotification => ({
  id: "n",
  kind: "joined",
  actor: { username: "danielk", name: "Daniel", avatar: null },
  roomId: "r1",
  postId: null,
  data: {},
  createdAt: "2026-09-27T12:00:00Z",
  read: false,
  ...over,
});

test("a win shows the profit and links to the room", () => {
  const v = describe(base({ kind: "won", actor: null, data: { amount: 1000, payout: 2500, prediction: "Arsenal to win" } }));
  assert.equal(v.text, "You called it — +$15");
  assert.equal(v.detail, "Arsenal to win · $25 to your wallet");
  assert.equal(v.href, "/rooms/r1");
  assert.equal(v.tone, "win");
});

test("a stake names the person, side and amount", () => {
  const v = describe(base({ kind: "big_stake", data: { side: "no", amount: 6000, pool: 9000, prediction: "Over 2.5" } }));
  assert.equal(v.who, "Daniel");
  assert.equal(v.text, "just put $60 on NO");
  assert.equal(v.detail, "Over 2.5 · pot $90");
});

test("replies and mentions open the thread they're in", () => {
  assert.equal(describe(base({ kind: "reply", roomId: null, postId: "p2", data: { parentId: "p1", body: "nah" } })).href, "/arena/p/p1");
  assert.equal(describe(base({ kind: "mention", roomId: null, postId: "p3", data: { parentId: null } })).href, "/arena/p/p3");
});

test("a loss names the winning side, never the loser", () => {
  const v = describe(base({ kind: "lost", actor: null, data: { outcome: "yes", side: "no", prediction: "BTTS" } }));
  assert.equal(v.text, "YES took this one");
  assert.equal(v.detail, "BTTS · you backed NO");
});

test("groups by day, dropping empty groups", () => {
  const now = new Date(2026, 8, 27, 15);
  const g = groupByDay(
    [
      base({ id: "a", createdAt: new Date(2026, 8, 27, 9).toISOString() }),
      base({ id: "b", createdAt: new Date(2026, 8, 25, 9).toISOString() }),
    ],
    now,
  );
  assert.deepEqual(
    g.map((x) => [x.label, x.items.map((i) => i.id)]),
    [
      ["Today", ["a"]],
      ["Earlier", ["b"]],
    ],
  );
});
