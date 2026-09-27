import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planPayouts, planSettlement, type StakeEntry } from "./payouts.ts";

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

describe("planSettlement (fees on winners' profit)", () => {
  const rates = { rivalyBps: 300, hostBps: 200 };

  it("with no fees it's exactly planPayouts", () => {
    const entries = [e("a", "yes", 1000), e("b", "yes", 3000), e("c", "no", 4000)];
    const plan = planSettlement(entries, "yes");
    assert.deepEqual(plan.payouts, planPayouts(entries, "yes"));
    assert.equal(plan.rivalyCents + plan.hostCents, 0);
  });

  it("$10 v $10: winner gets $19.50, Rivaly 30¢, host 20¢", () => {
    const plan = planSettlement([e("a", "yes", 1000), e("b", "no", 1000)], "yes", rates);
    assert.equal(plan.profitCents, 1000);
    assert.equal(plan.rivalyCents, 30);
    assert.equal(plan.hostCents, 20);
    assert.deepEqual(plan.payouts[0], { entryId: "a", cents: 1950, isWinner: true });
  });

  it("$1,000 pot, $400 on the winning side: $30 in fees, winners share $970", () => {
    const plan = planSettlement([e("a", "yes", 10000), e("b", "yes", 30000), e("c", "no", 60000)], "yes", rates);
    assert.equal(plan.rivalyCents, 1800);
    assert.equal(plan.hostCents, 1200);
    assert.equal(total(plan.payouts), 97000);
  });

  it("the pool is always paid out exactly, and no winner gets back less than their stake", () => {
    const entries = [e("a", "no", 333), e("b", "no", 334), e("c", "yes", 1001), e("d", "no", 337), e("f", "yes", 7)];
    for (const outcome of ["yes", "no"] as const) {
      const plan = planSettlement(entries, outcome, rates);
      assert.equal(total(plan.payouts) + plan.rivalyCents + plan.hostCents, 2012);
      for (const p of plan.payouts.filter((x) => x.isWinner)) {
        assert.ok(p.cents >= entries.find((x) => x.id === p.entryId)!.amountCents);
      }
    }
  });

  it("refunds pay no fee", () => {
    const voided = planSettlement([e("a", "yes", 500), e("b", "no", 700)], "void", rates);
    const oneSided = planSettlement([e("a", "yes", 500), e("b", "yes", 700)], "no", rates);
    for (const plan of [voided, oneSided]) {
      assert.equal(plan.rivalyCents + plan.hostCents, 0);
      assert.equal(total(plan.payouts), 1200);
    }
  });

  it("tiny profits round fees down to nothing rather than taking from a stake", () => {
    const plan = planSettlement([e("a", "yes", 100), e("b", "no", 10)], "yes", rates);
    assert.equal(plan.rivalyCents, 0);
    assert.equal(plan.hostCents, 0);
    assert.equal(plan.payouts[0].cents, 110);
  });

  it("a bad stored rate can't take more than 25% each", () => {
    const plan = planSettlement([e("a", "yes", 1000), e("b", "no", 1000)], "yes", { rivalyBps: 9000, hostBps: 0 });
    assert.equal(plan.rivalyCents, 250);
  });
});
