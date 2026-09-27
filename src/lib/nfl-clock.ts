// NFL game time from the TxLINE feed. Every record carries the quarter's
// countdown clock (`_clock`, seconds left: 900 → 0) but not which quarter it
// is — so the quarter is counted: when the clock jumps back up (0:00 → 15:00)
// a new one has started. Fed the match's records in order (the room page's
// initial fetch, then the live stream), it knows the quarter at every moment.
// Pure, shared by the chat feed lines and the match timeline.

export interface NflClock {
  quarter: number;
  last: number | null;
}

export const newNflClock = (): NflClock => ({ quarter: 1, last: null });

const QUARTER_SECONDS = 900;
// A real reset is ~15 minutes; small upward wobbles are corrections, not a new quarter.
const RESET_JUMP = 120;

/** Advances the clock with one record's payload; returns where that record sits, or null if it has no clock. */
export function nflTick(state: NflClock, payload: Record<string, unknown> | null | undefined): { quarter: number; clock: number } | null {
  const clock = typeof payload?._clock === "number" ? payload._clock : null;
  if (clock === null) return null;
  if (state.last !== null && clock > state.last + RESET_JUMP) state.quarter += 1;
  state.last = clock;
  return { quarter: state.quarter, clock };
}

/** Minutes of game time played: Q1 0–15, Q2 15–30 … overtime beyond 60. */
export function nflGameMinute(quarter: number, clock: number): number {
  return (quarter - 1) * 15 + Math.max(0, QUARTER_SECONDS - clock) / 60;
}

/** "Q2 8:26" · "OT 3:10". */
export function nflClockLabel(quarter: number, clock: number): string {
  const m = Math.floor(clock / 60);
  const s = Math.floor(clock % 60);
  return `${quarter > 4 ? "OT" : `Q${quarter}`} ${m}:${String(s).padStart(2, "0")}`;
}
