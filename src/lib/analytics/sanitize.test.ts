import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEvents, cleanPath, cleanProps, deviceFrom, hostOf, isBot } from "./sanitize.ts";

test("paths lose their query string (invite codes) and anything email-like", () => {
  assert.equal(cleanPath("/rooms/abc?code=SECRET1"), "/rooms/abc");
  assert.equal(cleanPath("/profile/someone@mail.com"), null);
  assert.equal(cleanPath("https://evil.com/x"), null);
});

test("props keep short primitives under safe keys, nothing else", () => {
  assert.deepEqual(cleanProps({ side: "yes", amount: 1000, ok: true, Bad: 1, nested: { a: 1 }, email: "a@b.com", long: "x".repeat(200) }), { side: "yes", amount: 1000, ok: true });
});

test("events are validated, capped and timestamped", () => {
  const now = Date.UTC(2026, 8, 27, 12);
  const out = cleanEvents([{ e: "page_view", p: "/arena?x=1", t: now - 1000 }, { e: "DROP TABLE" }, { e: "stake_panel_opened", t: now + 3_600_000 }], now);
  assert.equal(out.length, 2);
  assert.equal(out[0].path, "/arena");
  assert.equal(out[1].at, new Date(now).toISOString()); // a future timestamp is replaced with now
  assert.equal(cleanEvents(Array.from({ length: 40 }, () => ({ e: "page_view" })), now).length, 25);
});

test("devices, bots and referrer hosts", () => {
  assert.equal(deviceFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile"), "mobile");
  assert.equal(deviceFrom("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
  assert.equal(deviceFrom("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "desktop");
  assert.equal(isBot("Googlebot/2.1"), true);
  assert.equal(isBot("Mozilla/5.0 (iPhone) Mobile Safari"), false);
  assert.equal(hostOf("https://www.twitter.com/some/post"), "twitter.com");
  assert.equal(hostOf("not a url"), null);
});
