import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planPayouts, type StakeEntry } from "./payouts.ts";

const e = (id: string, side: "yes" | "no", amountCents: number): StakeEntry => ({ id, side, amountCents });
const total = (p: { cents: number }[]) => p.reduce((s, x) => s + x.cents, 0);

describe("planPayouts", () => {
  it("winners split the whole pool pro rata; losers get nothing", () => {
    const plan = planPayouts([e("a", "yes", 1000), e("b", "yes", 3000), e("c", "no", 4000)], "yes");
    assert.deepEqual(plan, [
      { entryId: "a", cents: 2000, isWinner: true },
      { entryId: "b", cents: 6000, isWinner: true },
      { entryId: "c", cents: 0, isWinner: false },
    ]);
  });
  it("pays out exactly the pool — leftover cents go to the largest winning stake", () => {
    const entries = [e("a", "no", 333), e("b", "no", 334), e("c", "yes", 1000), e("d", "no", 333)];
    const plan = planPayouts(entries, "no");
    assert.equal(total(plan), 2000);
    assert.equal(plan.find((p) => p.entryId === "b")!.cents >= plan.find((p) => p.entryId === "a")!.cents, true);
  });
  it("refunds everyone when the room is void", () => {
    const plan = planPayouts([e("a", "yes", 500), e("b", "no", 700)], "void");
    assert.deepEqual(plan, [
      { entryId: "a", cents: 500, isWinner: null },
      { entryId: "b", cents: 700, isWinner: null },
    ]);
  });
  it("refunds everyone when nobody backed the winning side", () => {
    const plan = planPayouts([e("a", "yes", 500), e("b", "yes", 700)], "no");
    assert.equal(plan.every((p) => p.isWinner === null), true);
    assert.equal(total(plan), 1200);
  });
  it("a lone winner takes the whole pool", () => {
    const plan = planPayouts([e("a", "yes", 100), e("b", "no", 900)], "yes");
    assert.deepEqual(plan[0], { entryId: "a", cents: 1000, isWinner: true });
  });
});
