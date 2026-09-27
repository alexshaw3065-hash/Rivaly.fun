import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingHostRange } from "./fee-math.ts";

test("pending host earnings: the smaller side losing to the bigger side losing", () => {
  // $20 on YES, $30 on NO at 2%: 40¢ if NO wins, 60¢ if YES wins.
  assert.deepEqual(pendingHostRange([{ yesCents: 2000, noCents: 3000, hostFeeBps: 200 }]), { min: 40, max: 60 });
});

test("a one-sided room earns nothing either way (no losers, or everyone refunded)", () => {
  assert.deepEqual(pendingHostRange([{ yesCents: 5000, noCents: 0, hostFeeBps: 200 }]), { min: 0, max: 0 });
});

test("adds up across rooms", () => {
  const r = pendingHostRange([
    { yesCents: 2000, noCents: 3000, hostFeeBps: 200 },
    { yesCents: 1000, noCents: 1000, hostFeeBps: 200 },
  ]);
  assert.deepEqual(r, { min: 60, max: 80 });
});
