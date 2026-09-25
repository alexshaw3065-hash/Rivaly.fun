// Match-day facts TxLINE sends around kick-off — the weather (with day or
// night), the state of the pitch, and whether it's a home or neutral venue —
// as Overview lines. Only what the feed actually sent; nothing when it
// hasn't. Pure.

import type { EventRow } from "./match-timeline";

const latest = (rows: EventRow[], action: string) => [...rows].reverse().find((r) => r.action === action)?.payload ?? null;

function list(v: unknown): string | null {
  if (!Array.isArray(v)) return null;
  const words = v.filter((w): w is string => typeof w === "string" && w.length > 0);
  return words.length ? words.join(" · ") : null;
}

export function matchConditions(rows: EventRow[]): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const weather = list(latest(rows, "weather")?.Conditions);
  if (weather) out.push({ label: "Weather", value: weather });
  const pitch = list(latest(rows, "pitch")?.Conditions);
  if (pitch) out.push({ label: "Pitch", value: pitch });
  const venue = latest(rows, "venue")?.Type;
  if (venue === "neutral") out.push({ label: "Venue", value: "Neutral ground" });
  return out;
}
