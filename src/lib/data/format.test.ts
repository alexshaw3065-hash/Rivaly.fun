import { test } from "node:test";
import assert from "node:assert/strict";
import { bearer, hashApiKey, newApiKey, toCsv } from "./format.ts";

test("CSV quotes commas, quotes and newlines, keeps column order", () => {
  const csv = toCsv([{ a: "x,y", b: 'he said "hi"', c: null }, { a: "line\nbreak", b: 2, c: true }], ["a", "b", "c"]);
  assert.equal(csv, 'a,b,c\n"x,y","he said ""hi""",\n"line\nbreak",2,true\n');
});

test("CSV neutralises spreadsheet formulas but keeps negative numbers", () => {
  assert.equal(toCsv([{ a: "=HYPERLINK(1)" }, { a: -5 }]), "a\n'=HYPERLINK(1)\n-5\n");
});

test("API keys: shaped, unique, only the hash identifies them", () => {
  const a = newApiKey();
  const b = newApiKey();
  assert.match(a.key, /^rvl_live_[A-Za-z0-9]{32}$/);
  assert.notEqual(a.key, b.key);
  assert.equal(a.hash, hashApiKey(a.key));
  assert.equal(a.prefix, a.key.slice(0, 13));
  assert.equal(bearer(`Bearer ${a.key}`), a.key);
  assert.equal(bearer("Bearer nope"), null);
  assert.equal(bearer(null), null);
});
