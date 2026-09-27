// Big Balls → Rivaly: the decisions, kept pure (tested in logic.test.ts).
// Only type imports, so Node runs this directly under `node --test`.
// Plan and limits: docs/plans/match-data-providers.md.

export type BbStatus = "scheduled" | "in_progress" | "finished" | "postponed" | "cancelled" | "suspended";
export type OurStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

/** The match object Big Balls returns (only the fields we read). */
export interface BbMatch {
  id: string;
  sport: string;
  league: string;
  kickoff_utc: string;
  status: BbStatus;
  home: { id: string; name: string };
  away: { id: string; name: string };
  score: { home: number | null; away: number | null } | null;
}

/** What Big Balls' status means for us. Suspended is still live: the match isn't over. */
export function mapStatus(s: BbStatus): OurStatus {
  if (s === "in_progress" || s === "suspended") return "live";
  return s;
}

export interface GoalEvent {
  /** Goal number in the match (1st, 2nd…): the stable key, so a re-read never duplicates one. */
  seq: number;
  side: "home" | "away";
  home: number;
  away: number;
}

/**
 * The goals between two scorelines, in order. Big Balls gives scores, not a
 * minute-by-minute feed on the free plan, so a goal is a score going up.
 * Two goals in one tick (a slow poll) come out home-first; the running score
 * on each is still exact.
 */
export function goalsBetween(prev: { home: number; away: number }, next: { home: number; away: number }): GoalEvent[] {
  const out: GoalEvent[] = [];
  let h = prev.home;
  let a = prev.away;
  while (h < next.home) {
    h += 1;
    out.push({ seq: h + a, side: "home", home: h, away: a });
  }
  while (a < next.away) {
    a += 1;
    out.push({ seq: h + a, side: "away", home: h, away: a });
  }
  return out;
}

/**
 * Goals taken back (VAR, or the source correcting itself): the goal numbers
 * above the new total. They get an action_discarded, which is what the
 * settlement safety window and the Arena both already honour.
 */
export function goalsWithdrawn(prev: { home: number; away: number }, next: { home: number; away: number }): number[] {
  const out: number[] = [];
  for (let n = prev.home + prev.away; n > next.home + next.away; n--) out.push(n);
  return out;
}

/**
 * Full time, confirmed. Big Balls is our only source for these leagues, so a
 * "finished" is only believed once it has held — same score, still finished —
 * for CONFIRM_MS. A correction in that window (a goal given late, or taken
 * back) restarts it. Payouts read the match's status, so nothing is paid on
 * a full-time the source then changes its mind about.
 */
export const CONFIRM_MS = 5 * 60_000;

export interface PendingFinal {
  home: number;
  away: number;
  since: number;
}

export function confirmFinal(
  pending: PendingFinal | undefined,
  seen: { status: BbStatus; home: number | null; away: number | null },
  now: number,
): { confirmed: boolean; pending: PendingFinal | undefined } {
  if (seen.status !== "finished" || seen.home === null || seen.away === null) return { confirmed: false, pending: undefined };
  if (!pending || pending.home !== seen.home || pending.away !== seen.away) {
    return { confirmed: false, pending: { home: seen.home, away: seen.away, since: now } };
  }
  return { confirmed: now - pending.since >= CONFIRM_MS, pending };
}

// ── The budget governor ──────────────────────────────────────────────

export const DAILY_LIMIT = 500;
/** Held back for the day's last confirmations — never spent on routine ticks. */
export const RESERVE = 30;
export const BASE_MS = 60_000;
export const FAST_MS = 45_000;
export const MAX_MS = 5 * 60_000;
/** How long after kickoff a match can still need polling (90' + stoppage + half-time + a delayed start). */
export const MATCH_WINDOW_MS = 135 * 60_000;

export interface Window {
  /** One poll covers one league on one date. */
  group: string;
  kickoff: number;
}

/**
 * How many polls the rest of today still needs at the base cadence: for each
 * league/date group, the minutes from now until its last match's window
 * closes (overlapping matches in one group share polls).
 */
export function ticksStillNeeded(windows: Window[], now: number, endOfDay: number): number {
  const groups = new Map<string, { start: number; end: number }>();
  for (const w of windows) {
    const start = Math.max(now, w.kickoff);
    const end = Math.min(endOfDay, w.kickoff + MATCH_WINDOW_MS);
    if (end <= start) continue;
    const g = groups.get(w.group);
    groups.set(w.group, g ? { start: Math.min(g.start, start), end: Math.max(g.end, end) } : { start, end });
  }
  let ticks = 0;
  for (const g of groups.values()) ticks += Math.ceil((g.end - g.start) / BASE_MS);
  return ticks;
}

/**
 * Wait before the next poll. 60s normally; 45s near the end of a match or
 * when one goal would decide a room — if the day's budget can afford it;
 * stretched (up to 5 min) when the calls left today wouldn't last at 60s.
 */
export function nextDelay(opts: { usedToday: number; ticksNeeded: number; urgent: boolean }): number {
  const spare = DAILY_LIMIT - RESERVE - opts.usedToday;
  if (spare <= 0) return MAX_MS;
  if (opts.ticksNeeded <= 0) return BASE_MS;
  const stretch = opts.ticksNeeded / spare;
  if (opts.urgent && stretch * (BASE_MS / FAST_MS) <= 1) return FAST_MS;
  if (stretch <= 1) return BASE_MS;
  return Math.min(MAX_MS, Math.ceil(BASE_MS * stretch));
}
