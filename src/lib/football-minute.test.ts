import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { currentStatus, footballMinute } from "./football-minute.ts";

describe("footballMinute", () => {
  it("writes first-half stoppage as 45+N", () => {
    assert.equal(footballMinute(48, 2), "45+3");
    assert.equal(footballMinute(45, 2), "45");
  });
  it("keeps the second half's own minutes, and 90+N after ninety", () => {
    assert.equal(footballMinute(48, 4), "48");
    assert.equal(footballMinute(93, 4), "90+3");
  });
  it("without a period, only past 90 counts as added time", () => {
    assert.equal(footballMinute(48), "48");
    assert.equal(footballMinute(92), "90+2");
  });
});

describe("currentStatus", () => {
  it("reads the latest period from status records or event stamps", () => {
    assert.equal(currentStatus([{ payload: { _st: 2 } }, { payload: { StatusId: 3 } }, { payload: null }]), 3);
    assert.equal(currentStatus([{ payload: { _clock: 10 } }]), null);
  });
});
