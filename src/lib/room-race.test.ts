import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { foldMessage, levelsAt, newRace, raceFrom, type RaceSide } from "./room-race.ts";

/** `count` messages from each of `users`, taking turns, `gapMs` apart. */
function burst(users: string[], side: RaceSide, count: number, gapMs: number, start = 0) {
  const out: { userId: string; side: RaceSide; at: number }[] = [];
  let t = start;
  for (let i = 0; i < count; i++) {
    for (const u of users) {
      out.push({ userId: u, side, at: t });
      t += gapMs;
    }
  }
  return out;
}

describe("room race", () => {
  it("a silent room has no holder and no energy", () => {
    const r = newRace(0);
    assert.equal(r.holder, null);
    assert.deepEqual(levelsAt(r, 10_000), { yes: 0, no: 0 });
  });

  it("one person hammering the chat can't take the stadium alone", () => {
    const r = raceFrom(burst(["solo"], "yes", 200, 1200)); // 4 minutes of non-stop spam
    assert.equal(r.holder, null);
    assert.ok(r.energy.yes < 4, `solo energy ${r.energy.yes}`);
  });

  it("a group of backers takes the stadium", () => {
    const r = raceFrom(burst(["a", "b", "c"], "yes", 3, 3000));
    assert.equal(r.holder, "yes");
    assert.equal(r.takeovers.length, 1);
    assert.equal(r.takeovers[0].side, "yes");
  });

  it("the holder keeps the stadium when it goes quiet", () => {
    const took = raceFrom(burst(["a", "b", "c"], "yes", 3, 3000));
    const muchLater = foldMessage(took, "d", "no", took.at + 10 * 60_000); // one NO message ten minutes on
    assert.equal(muchLater.holder, "yes");
    assert.ok(levelsAt(muchLater, muchLater.at).yes < 0.01);
  });

  it("the other side takes it only by fighting back louder", () => {
    const yes = raceFrom(burst(["a", "b", "c"], "yes", 3, 3000));
    const fightBack = burst(["x", "y", "z", "w"], "no", 3, 2000, yes.at + 1000).reduce(
      (s, m) => foldMessage(s, m.userId, m.side, m.at),
      yes,
    );
    assert.equal(fightBack.holder, "no");
    assert.deepEqual(
      fightBack.takeovers.map((t) => t.side),
      ["yes", "no"],
    );
  });

  it("is deterministic regardless of the order the log arrives in", () => {
    const log = [...burst(["a", "b"], "yes", 4, 2500), ...burst(["x", "y", "z"], "no", 3, 3100, 500)];
    const shuffled = [...log].reverse();
    assert.deepEqual(raceFrom(log), raceFrom(shuffled));
  });
});
