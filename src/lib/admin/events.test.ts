import { test } from "node:test";
import assert from "node:assert/strict";
import { describeEvent, type PlatformEvent } from "./events.ts";

const ctx = { users: { u1: "Daniel", u2: "Ada" }, rooms: { r1: "Barcelona to beat Getafe" }, matches: { m1: "Barcelona v Getafe" } };
const ev = (over: Partial<PlatformEvent>): PlatformEvent => ({
  id: "e",
  at: "2026-09-27T12:00:00Z",
  type: "USER_SIGNUP",
  user_id: "u1",
  room_id: null,
  match_id: null,
  tx_signature: null,
  amount_cents: null,
  metadata: {},
  source: "app",
  status: "ok",
  ...over,
});

test("a stake names the person, amount, side and room, and links to the room", () => {
  const l = describeEvent(ev({ type: "STAKE_PLACED", room_id: "r1", amount_cents: 2000, metadata: { side: "no" } }), ctx);
  assert.equal(l.text, "Daniel put $20 on NO in “Barcelona to beat Getafe”");
  assert.equal(l.href, "/admin/rooms/r1");
  assert.equal(l.tone, "money");
});

test("a host's own opening stake reads as backing their room", () => {
  const l = describeEvent(ev({ type: "STAKE_PLACED", room_id: "r1", amount_cents: 1000, metadata: { side: "yes", is_creator: true } }), ctx);
  assert.equal(l.text, "Daniel backed their own room with $10 on YES");
});

test("failures are flagged bad and say why", () => {
  const l = describeEvent(ev({ type: "SETTLEMENT_FAILED", user_id: null, room_id: "r1", status: "failed", metadata: { error: "RPC timeout" } }), ctx);
  assert.equal(l.tone, "bad");
  assert.match(l.text, /RPC timeout/);
});

test("follows name both people", () => {
  assert.equal(describeEvent(ev({ type: "FOLLOW", metadata: { following_id: "u2" } }), ctx).text, "Daniel followed Ada");
});

test("fees say who earned them", () => {
  assert.equal(describeEvent(ev({ type: "FEE_EARNED", room_id: "r1", amount_cents: 60, metadata: { kind: "host" } }), ctx).text, "Daniel earned $0.60 hosting “Barcelona to beat Getafe”");
  assert.equal(describeEvent(ev({ type: "FEE_EARNED", user_id: null, room_id: "r1", amount_cents: 90, metadata: { kind: "rivaly" } }), ctx).text, "Rivaly earned $0.90 from “Barcelona to beat Getafe”");
});

test("unknown types still read as words", () => {
  assert.equal(describeEvent(ev({ type: "SOMETHING_NEW" }), ctx).text, "something new");
});
