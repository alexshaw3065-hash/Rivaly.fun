import { test } from "node:test";
import assert from "node:assert/strict";
import { crestKey, looseKey, pickCandidate, searchVariants, type Candidate } from "./key.ts";

const team = (name: string, extra: Partial<Candidate> = {}): Candidate => ({
  id: name,
  name,
  alternates: [],
  short: null,
  sport: "Soccer",
  gender: "Male",
  badge: `https://example.test/${name}.png`,
  leagues: [],
  ...extra,
});

const EPL = ["English Premier League"];

test("crestKey: case, accents and spacing never split one team in two", () => {
  assert.equal(crestKey("Atlético  Madrid"), "atletico madrid");
  assert.equal(crestKey("Borussia Mönchengladbach"), crestKey("borussia monchengladbach"));
});

test("looseKey: club-form noise, Utd and NFL city abbreviations don't matter", () => {
  assert.equal(looseKey("Sevilla FC"), looseKey("Sevilla"));
  assert.equal(looseKey("Manchester Utd"), looseKey("Manchester United"));
  assert.equal(looseKey("AS Roma"), "roma");
  assert.equal(looseKey("N.Y. Jets"), looseKey("New York Jets"));
  assert.equal(looseKey("L.A. Rams"), looseKey("Los Angeles Rams"));
});

test("searchVariants: known short names search under their full name first", () => {
  assert.equal(searchVariants("Leeds")[0], "Leeds United");
  assert.ok(searchVariants("N.Y. Giants").includes("New York Giants"));
});

test("pickCandidate: its own name matching ours (or our alias) is trusted", () => {
  assert.equal(pickCandidate("Arsenal", "Soccer", [team("Arsenal")], EPL)?.name, "Arsenal");
  // Promoted clubs may still be filed under the Championship — the name alone decides.
  assert.equal(pickCandidate(["Coventry", "Coventry City"], "Soccer", [team("Coventry City", { leagues: ["English League Championship"] })], EPL)?.name, "Coventry City");
  assert.equal(pickCandidate(["New York RB", "New York Red Bulls"], "Soccer", [team("New York Red Bulls")])?.name, "New York Red Bulls");
  assert.equal(pickCandidate("N.Y. Jets", "American Football", [team("New York Jets", { sport: "American Football" })])?.name, "New York Jets");
});

test("pickCandidate: a namesake from another league is rejected", () => {
  assert.equal(pickCandidate("Newcastle", "Soccer", [team("Newcastle Jets", { leagues: ["Australian A-League"] })], EPL), null);
  assert.equal(pickCandidate("Lille", "Soccer", [team("Lille United", { leagues: ["English Non League"] })], ["French Ligue 1"]), null);
  assert.equal(pickCandidate("Athletic Club", "Soccer", [team("Athletic Club-MG", { leagues: ["Brazilian Serie B"] })], ["Spanish La Liga"]), null);
});

test("pickCandidate: B sides and reserve teams are rejected", () => {
  assert.equal(pickCandidate("Minnesota United FC", "Soccer", [team("Minnesota United FC 2", { leagues: ["MLS Next Pro"] })], ["American Major League Soccer"]), null);
  assert.equal(pickCandidate("Club Brugge KV", "Soccer", [team("Club NXT", { alternates: ["Club Brugge KV II"], leagues: ["Belgian Challenger Pro League"] })], ["UEFA Champions League"]), null);
});

test("pickCandidate: a partial match in the right league is accepted", () => {
  assert.equal(pickCandidate("Leeds", "Soccer", [team("Leeds United", { leagues: EPL })], EPL)?.name, "Leeds United");
});

test("pickCandidate: without a league to check, a partial match may only add generic words", () => {
  assert.equal(pickCandidate("Leeds", "Soccer", [team("Leeds United")])?.name, "Leeds United");
  assert.equal(pickCandidate("Newcastle", "Soccer", [team("Newcastle Jets")]), null);
});

test("pickCandidate: wrong sport, women's and youth sides are ignored", () => {
  assert.equal(pickCandidate("Arsenal", "Soccer", [team("Arsenal Women", { gender: "Female" }), team("Arsenal U21")]), null);
  assert.equal(pickCandidate("Giants", "American Football", [team("Giants")]), null);
  assert.equal(pickCandidate("Arsenal", "Soccer", [team("Arsenal U21"), team("Arsenal")])?.name, "Arsenal");
});

test("pickCandidate: no badge, no crest", () => {
  assert.equal(pickCandidate("Arsenal", "Soccer", [team("Arsenal", { badge: null })]), null);
});
