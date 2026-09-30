import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { abbreviateClaim, teamIdentity } from "./team-identity.ts";

describe("abbreviateClaim", () => {
  it("shortens both teams to codes when the call names both", () => {
    assert.equal(
      abbreviateClaim("Seattle Sounders v Real Salt Lake ends in a draw", "Seattle Sounders", "Real Salt Lake"),
      "SEA v RSL ends in a draw",
    );
  });
  it("keeps a lone team in full and phrases it as 'to win'", () => {
    assert.equal(abbreviateClaim("Kansas City Chiefs win", "Kansas City Chiefs", "Buffalo Bills"), "Kansas City Chiefs to win");
    assert.equal(abbreviateClaim("Seattle Sounders wins", "Seattle Sounders", "Real Salt Lake"), "Seattle Sounders to win");
  });
  it("keeps a margin after 'to win'", () => {
    assert.equal(abbreviateClaim("Kansas City Chiefs win by 7+", "Kansas City Chiefs", "Buffalo Bills"), "Kansas City Chiefs to win by 7+");
  });
  it("leaves calls that name no team untouched", () => {
    assert.equal(abbreviateClaim("Over 2.5 goals", "Seattle Sounders", "Real Salt Lake"), "Over 2.5 goals");
  });
});

describe("teamIdentity codes", () => {
  it("uses real codes for the European leagues, not initials", () => {
    assert.equal(teamIdentity("Bayer Leverkusen").code, "LEV");
    assert.equal(teamIdentity("Real Madrid").code, "RMA");
    assert.equal(teamIdentity("Paris Saint-Germain").code, "PSG");
    assert.equal(teamIdentity("Borussia Dortmund").code, "BVB");
  });
  it("still builds a code for a team it doesn't know", () => {
    assert.equal(teamIdentity("Some New Club").code, "SNC");
  });
  it("calls with both European teams shorten to their codes", () => {
    assert.equal(abbreviateClaim("Mainz v Bayer Leverkusen ends in a draw", "Mainz", "Bayer Leverkusen"), "M05 v LEV ends in a draw");
  });
});
