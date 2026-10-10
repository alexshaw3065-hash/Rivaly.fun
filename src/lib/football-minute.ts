// Football's way of writing the minute: 45+3' in first-half stoppage time,
// 90+2' after ninety, and the same at the end of each half of extra time.
//
// TxLINE's clock runs on past 45:00 in the first half and restarts at 45:00
// for the second, so a minute alone can't tell 45+3 from the 48th minute.
// The period can: soccer's StatusId (2 first half, 3 half-time, 4 second
// half, 6/8 the halves of extra time), which the normaliser stores on every
// event as _st. Environment-agnostic, like match-event-label.ts.

const HALF_END: Record<number, number> = { 2: 45, 4: 90, 6: 105, 8: 120 };

/** Soccer StatusId for the half-time break. */
export const SOCCER_HALFTIME = 3;

/** "48" in the second half, "45+3" in first-half stoppage; no apostrophe, so callers add their own. */
export function footballMinute(minute: number, status?: unknown): string {
  // Without a period, only past 90 is certain to be added time.
  const end = typeof status === "number" ? HALF_END[status] : minute > 90 ? 90 : undefined;
  return end !== undefined && minute > end ? `${end}+${minute - end}` : `${minute}`;
}

/** The period the match is in: the StatusId of the latest record that carried one. */
export function currentStatus(rows: { payload: Record<string, unknown> | null }[]): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const p = rows[i].payload;
    // A status record carries it as StatusId; every other event as _st.
    const s = typeof p?.StatusId === "number" ? p.StatusId : typeof p?._st === "number" ? p._st : null;
    if (s !== null) return s;
  }
  return null;
}
