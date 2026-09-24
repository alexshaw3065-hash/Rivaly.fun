// TxLINE reports one event as several records: a first, unconfirmed report
// (fast — a goal lands about a minute before it's confirmed), the
// confirmation, and often a third record with the detail (the scorer). A
// later action_amend corrects an event it finds by clock (a card's player, a
// substitution's in/out), and action_discarded withdraws one reported in
// error. collapseEvents() folds all of that into one row per real event, so
// the timeline, the stats and the line-up count each thing once. Pure —
// tested in match-feed.test.ts.
//
// Rows stored before the event id (payload._eid) was kept pass through
// untouched: there's nothing to group them by.

import type { EventRow } from "./match-timeline";

const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const clockOf = (v: unknown): number | null => num((v as { Clock?: { Seconds?: unknown } } | undefined)?.Clock?.Seconds);

export function collapseEvents(rows: EventRow[]): EventRow[] {
  const discarded = new Set<number>();
  for (const r of rows) {
    const eid = num(r.payload?._eid);
    if (r.action === "action_discarded" && eid !== null) discarded.add(eid);
  }

  const out: EventRow[] = [];
  const byEid = new Map<string, EventRow>();
  for (const r of rows) {
    if (r.action === "action_discarded") continue;
    const eid = num(r.payload?._eid);

    if (r.action === "action_amend") {
      applyAmend(out, r);
      continue;
    }
    if (eid === null) {
      out.push(r);
      continue;
    }
    if (discarded.has(eid)) continue;

    const key = `${r.action}:${eid}`;
    const first = byEid.get(key);
    if (!first) {
      const copy = { ...r, payload: { ...(r.payload ?? {}) } };
      byEid.set(key, copy);
      out.push(copy);
      continue;
    }
    // Keep the first report's time (that's when the room saw it) and add
    // whatever the later records know.
    first.payload = { ...first.payload, ...stripEmpty(r.payload) };
    if (first.minute === null) first.minute = r.minute;
  }
  return out;
}

/** An amend: find its event (same action, at the clock the amend says it had) and correct it. */
function applyAmend(rows: EventRow[], amend: EventRow): void {
  const p = amend.payload ?? {};
  const action = typeof p.Action === "string" ? p.Action : null;
  if (!action) return;
  const was = clockOf(p.Previous) ?? clockOf(p.New);
  const target = [...rows].reverse().find((r) => r.action === action && num(r.payload?._clock) === was);
  if (!target) return;
  const fix = { ...((p.New as Record<string, unknown>) ?? {}) };
  const clock = clockOf(fix);
  delete fix.Clock;
  target.payload = { ...target.payload, ...fix, ...(clock !== null ? { _clock: clock } : {}) };
  if (clock !== null) target.minute = Math.floor(clock / 60) + 1;
}

/**
 * TxLINE logs a "kickoff" for every restart after a goal as well as for each
 * half. A period starts on a whole quarter-hour of the clock (0, 45', 90',
 * 105'); a restart lands mid-play. Rows without a clock (stored before it was
 * kept) count as the start.
 */
export function kickoffKind(payload: Record<string, unknown> | null): "start" | "second-half" | "extra-time" | "restart" {
  const c = num(payload?._clock);
  if (c === null || c === 0) return "start";
  if (c % 900 !== 0) return "restart";
  return c === 2700 ? "second-half" : "extra-time";
}

function stripEmpty(p: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p ?? {})) if (v !== undefined && v !== null) out[k] = v;
  return out;
}
