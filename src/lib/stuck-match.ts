import type { Match } from "./types";

// A match still "scheduled" this long after kick-off has a stuck feed (Big
// Balls has delivered results 5–18 hours late): it isn't upcoming and isn't
// shown as live or finished either, so the discovery lists (Home's matches,
// its rooms and Exploding now, Rooms → Discover) leave it out until the
// result arrives. Its rooms still open from their links and from Mine.
const STUCK_AFTER_MS = 3 * 60 * 60_000;

export function isStuckMatch(m: Pick<Match, "status" | "kickoffAt">, now = Date.now()): boolean {
  return m.status === "scheduled" && +new Date(m.kickoffAt) < now - STUCK_AFTER_MS;
}
