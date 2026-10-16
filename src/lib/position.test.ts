import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { positionOf } from "./position.ts";

const stake = (side: "yes" | "no", amountCents: number, isWinner: boolean | null = null, payoutCents: number | null = null) => ({ side, amountCents, isWinner, payoutCents });

describe("positionOf", () => {
  it("open with a rival: pays its share of the other side, net of fees on profit", () => {
    const p = positionOf({ status: "open", yesTotalCents: 1000, noTotalCents: 1000, feeBps: 300, hostFeeBps: 200 }, stake("yes", 1000));
    assert.equal(p.state, "open");
    assert.equal(p.returnCents, 1950); // $10 back + $10 profit less 5%
    assert.equal(p.profitCents, 950);
    assert.equal(p.roiPct, 95);
    assert.ok(Math.abs(p.multiple - 1.95) < 1e-9);
  });
  it("open with nobody on the other side: waiting, stake only", () => {
    const p = positionOf({ status: "open", yesTotalCents: 500, noTotalCents: 0 }, stake("yes", 500));
    assert.equal(p.state, "waiting");
    assert.equal(p.returnCents, 500);
  });
  it("shares the win with others on the same side", () => {
    const p = positionOf({ status: "live", yesTotalCents: 3000, noTotalCents: 1000 }, stake("yes", 1000));
    assert.equal(p.returnCents, 1000 + Math.floor(1000 / 3));
  });
  it("settled: won, lost, stake back, refunded", () => {
    assert.equal(positionOf({ status: "settled" }, stake("no", 1000, true, 1950)).state, "won");
    const lost = positionOf({ status: "settled" }, stake("no", 1000, false, 0));
    assert.equal(lost.state, "lost");
    assert.equal(lost.roiPct, -100);
    assert.equal(positionOf({ status: "settled" }, stake("yes", 1000, true, 1000)).state, "stake-back");
    assert.equal(positionOf({ status: "refunded" }, stake("yes", 1000)).state, "refunded");
  });
});
