import { teamIdentity } from "./team-identity";
import type { Match } from "./types";

// Each side's colour for charts, the pitch and the share card: the kits worn
// on the day when the feed says (see kitsFrom in room-lineup.tsx), otherwise
// club colours — with the away side in its second colour if the two would
// blur together (red v red, blue v blue). Shared by client components and
// the server-rendered share card, so it lives outside any "use client" file.

export type Kit = { fill: string; ink: string };

export function teamFills(match: Pick<Match, "homeTeam" | "awayTeam">, kits: { home?: string; away?: string } = {}): { home: Kit; away: Kit; codes: { home: string; away: string } } {
  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);
  const homeFill = kits.home ?? home.primary;
  const awayFill = kits.away ?? (clash(homeFill, away.primary) ? away.secondary : away.primary);
  return { home: { fill: homeFill, ink: inkOn(homeFill) }, away: { fill: awayFill, ink: inkOn(awayFill) }, codes: { home: home.code, away: away.code } };
}

function clash(a: string, b: string): boolean {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2) < 90;
}

/** Text colour that reads on a fill. */
export function inkOn(hex: string): string {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#0b0d10" : "#ffffff";
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, "0");
  const v = Number.parseInt(full.slice(0, 6), 16) || 0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
