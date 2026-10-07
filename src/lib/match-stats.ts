// Team stats for the room's Stats tab, from what TxLINE actually sends —
// verified against full match logs:
//   - goals, corners and cards: the feed's own running totals (the match row)
//   - shots, on target, fouls, offsides: counted from the event stream, each
//     event carrying its team as payload._side (see normalizeEvents)
//   - possession: time on the ball, from the possession state most in-play
//     records carry (payload._poss) weighted by the match clock between them
//   - big chances: the feed's "possible goal" flag, raised in the seconds
//     before a shot that could go in
// Rows must be collapsed first (collapseEvents) or each shot counts once per
// record the feed sent about it. The full set shows from before kick-off,
// at zero, so the tab reads the same before and during the match. Pure —
// tested in match-stats.test.ts.

import type { EventRow } from "./match-timeline";
import type { Match } from "./types";

export interface StatRow {
  key: string;
  label: string;
  home: number;
  away: number;
  /** Shown as a percentage (possession). */
  pct?: boolean;
}

type Side = "home" | "away";
const other = (s: Side): Side => (s === "home" ? "away" : "home");
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

function sideOf(v: unknown): Side | null {
  return v === "home" || v === "away" ? v : null;
}

export function matchStats(match: Match, rows: EventRow[], sport: "soccer" | "nfl" = "soccer"): StatRow[] {
  if (sport === "nfl") {
    return [
      { key: "points", label: "Points", home: match.homeScore ?? 0, away: match.awayScore ?? 0 },
      { key: "touchdowns", label: "Touchdowns", home: match.homeTouchdowns ?? 0, away: match.awayTouchdowns ?? 0 },
      { key: "field-goals", label: "Field goals", home: match.homeFieldGoals ?? 0, away: match.awayFieldGoals ?? 0 },
    ];
  }

  // Big Balls leagues: no ball-by-ball feed, so the provider's own
  // post-match totals once they arrive.
  const box = match.boxScore;
  if (box) {
    const h = box.home;
    const a = box.away;
    const v = (x: number | null) => x ?? 0;
    const out: StatRow[] = [
      { key: "possession", label: "Possession", home: v(h.possession), away: v(a.possession), pct: true },
      { key: "shots", label: "Shots", home: v(h.shots), away: v(a.shots) },
      { key: "on-target", label: "Shots on target", home: v(h.onTarget), away: v(a.onTarget) },
      { key: "corners", label: "Corners", home: v(h.corners), away: v(a.corners) },
      { key: "fouls", label: "Fouls", home: v(h.fouls), away: v(a.fouls) },
      { key: "offsides", label: "Offsides", home: v(h.offsides), away: v(a.offsides) },
      { key: "saves", label: "Saves", home: v(h.saves), away: v(a.saves) },
      { key: "yellow", label: "Yellow cards", home: v(h.yellow), away: v(a.yellow) },
      { key: "red", label: "Red cards", home: v(h.red), away: v(a.red) },
    ];
    return out;
  }

  const tally = (pick: (r: EventRow) => Side | null) => {
    const t = { home: 0, away: 0 };
    for (const r of rows) {
      const s = pick(r);
      if (s) t[s]++;
    }
    return t;
  };
  const shots = tally((r) => (r.action === "shot" ? sideOf(r.payload?._side) : null));
  const onTarget = tally((r) => (r.action === "shot" && r.payload?.Outcome === "OnTarget" ? sideOf(r.payload?._side) : null));
  // A free kick goes to the team that was fouled (or caught the other side
  // offside), so the foul or offside belongs to the other team. Only the
  // confirmed record carries FreeKickType.
  const fouls = tally((r) => {
    if (r.action !== "free_kick" || !r.payload?.FreeKickType || r.payload.FreeKickType === "Offside") return null;
    const s = sideOf(r.payload._side);
    return s ? other(s) : null;
  });
  const offsides = tally((r) => {
    if (r.action !== "free_kick" || r.payload?.FreeKickType !== "Offside") return null;
    const s = sideOf(r.payload._side);
    return s ? other(s) : null;
  });
  const chances = tally((r) => (r.action === "possible" && r.payload?.Goal === true ? sideOf(r.payload._side) : null));
  const corners = tally((r) => (r.action === "corner" ? sideOf(r.payload?._side) : null));
  const yellows = tally((r) => (r.action === "yellow_card" ? sideOf(r.payload?._side) : null));
  const reds = tally((r) => (r.action === "red_card" ? sideOf(r.payload?._side) : null));
  const poss = possession(rows);

  // The feed's running totals win where they exist; the event count stands in
  // until the first one arrives.
  const or = (v: number | null | undefined, fallback: number) => (typeof v === "number" ? v : fallback);
  return [
    { key: "possession", label: "Possession", home: poss.home, away: poss.away, pct: true },
    { key: "shots", label: "Shots", home: shots.home, away: shots.away },
    { key: "on-target", label: "Shots on target", home: onTarget.home, away: onTarget.away },
    { key: "chances", label: "Big chances", home: chances.home, away: chances.away },
    { key: "corners", label: "Corners", home: or(match.homeCorners, corners.home), away: or(match.awayCorners, corners.away) },
    { key: "fouls", label: "Fouls", home: fouls.home, away: fouls.away },
    { key: "offsides", label: "Offsides", home: offsides.home, away: offsides.away },
    { key: "yellow", label: "Yellow cards", home: or(match.homeYellowCards, yellows.home), away: or(match.awayYellowCards, yellows.away) },
    { key: "red", label: "Red cards", home: or(match.homeRedCards, reds.home), away: or(match.awayRedCards, reds.away) },
  ];
}

/**
 * Possession as whole percentages: each stretch between two records goes to
 * whoever had the ball at the start of it. Stretches longer than two minutes
 * (half-time, a long stoppage) are capped so a break doesn't count as
 * possession. 0 / 0 before anyone has touched the ball.
 */
export function possession(rows: EventRow[]): { home: number; away: number } {
  const marks = rows
    .map((r) => ({ side: sideOf(r.payload?._poss), clock: num(r.payload?._clock) }))
    .filter((m): m is { side: Side; clock: number } => m.side !== null && m.clock !== null)
    .sort((a, b) => a.clock - b.clock);
  const time = { home: 0, away: 0 };
  for (let i = 0; i < marks.length - 1; i++) time[marks[i].side] += Math.min(120, Math.max(0, marks[i + 1].clock - marks[i].clock));
  const total = time.home + time.away;
  if (total === 0) return { home: 0, away: 0 };
  const home = Math.round((time.home / total) * 100);
  return { home, away: 100 - home };
}

export interface MomentumBar {
  /** Match minute the bar covers (1-based, like the clock). */
  minute: number;
  /** Pressure: positive leans home, negative away. */
  value: number;
}

export interface MomentumMark {
  minute: number;
  side: Side;
  kind: "goal" | "chance";
}

// How much a minute of each possession state counts toward pressure: keeping
// the ball safe is nothing; getting into the box is most of it.
const PRESSURE: Record<string, number> = {
  attack_possession: 1,
  danger_possession: 2.5,
  high_danger_possession: 4,
};

/**
 * Who was on top, minute by minute — the attacking-pressure graph fans know
 * from match apps. Built from the feed's attack / danger / high-danger
 * possession states, with goals and big chances marked on it.
 */
export function momentum(rows: EventRow[]): { bars: MomentumBar[]; marks: MomentumMark[]; lastMinute: number } {
  const byMinute = new Map<number, number>();
  const marks: MomentumMark[] = [];
  let lastMinute = 0;
  for (const r of rows) {
    const clock = num(r.payload?._clock);
    const minute = clock !== null ? Math.floor(clock / 60) + 1 : r.minute;
    if (minute === null || minute < 1) continue;
    const side = sideOf(r.payload?._side);
    const w = PRESSURE[r.action];
    if (w && side) {
      byMinute.set(minute, (byMinute.get(minute) ?? 0) + (side === "home" ? w : -w));
      lastMinute = Math.max(lastMinute, minute);
    }
    if (r.action === "goal") {
      // Own goals count for the other team; the score change says who.
      const s = sideOf(r.payload?._side);
      if (s) marks.push({ minute, side: s, kind: "goal" });
    } else if (r.action === "possible" && r.payload?.Goal === true && side) {
      marks.push({ minute, side, kind: "chance" });
    }
  }
  const bars: MomentumBar[] = [];
  for (let m = 1; m <= lastMinute; m++) bars.push({ minute: m, value: byMinute.get(m) ?? 0 });
  return { bars, marks, lastMinute };
}
