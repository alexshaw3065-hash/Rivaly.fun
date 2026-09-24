// Team stats for the room's Stats tab, from what TxLINE actually sends:
// goals, cards and corners per team (the match row), plus shots, fouls and
// offsides counted from the event stream (each event carries its team as
// payload._side — see normalizeEvents). TxLINE has no possession or passing
// data, so those rows simply don't exist here; a stat only appears when
// there's real data behind it. Pure — tested in match-stats.test.ts.

import type { EventRow } from "./match-timeline";
import type { Match } from "./types";

export interface StatRow {
  key: string;
  label: string;
  home: number;
  away: number;
}

type Side = "home" | "away";
const other = (s: Side): Side => (s === "home" ? "away" : "home");

function sideOf(row: EventRow): Side | null {
  const s = row.payload?._side;
  return s === "home" || s === "away" ? s : null;
}

export function matchStats(match: Match, rows: EventRow[]): StatRow[] {
  const out: StatRow[] = [];
  const started = match.status === "live" || match.status === "finished";
  if (!started) return out;

  out.push({ key: "goals", label: "Goals", home: match.homeScore ?? 0, away: match.awayScore ?? 0 });

  // Counted from events, only where the feed told us the team.
  const tally = (pick: (r: EventRow) => Side | null) => {
    const t = { home: 0, away: 0, any: false };
    for (const r of rows) {
      const s = pick(r);
      if (!s) continue;
      t[s]++;
      t.any = true;
    }
    return t;
  };
  const shots = tally((r) => (r.action === "shot" ? sideOf(r) : null));
  const onTarget = tally((r) => (r.action === "shot" && r.payload?.Outcome === "OnTarget" ? sideOf(r) : null));
  // A free kick is awarded to the team that was fouled (or caught the other
  // side offside), so the foul or offside belongs to the other team.
  const fouls = tally((r) => {
    if (r.action !== "free_kick" || r.payload?.FreeKickType === "Offside") return null;
    const s = sideOf(r);
    return s ? other(s) : null;
  });
  const offsides = tally((r) => {
    if (r.action !== "free_kick" || r.payload?.FreeKickType !== "Offside") return null;
    const s = sideOf(r);
    return s ? other(s) : null;
  });

  if (shots.any) out.push({ key: "shots", label: "Shots", home: shots.home, away: shots.away });
  if (shots.any) out.push({ key: "on-target", label: "Shots on target", home: onTarget.home, away: onTarget.away });
  if (typeof match.homeCorners === "number" && typeof match.awayCorners === "number")
    out.push({ key: "corners", label: "Corners", home: match.homeCorners, away: match.awayCorners });
  if (fouls.any) out.push({ key: "fouls", label: "Fouls", home: fouls.home, away: fouls.away });
  if (offsides.any) out.push({ key: "offsides", label: "Offsides", home: offsides.home, away: offsides.away });
  if (typeof match.homeYellowCards === "number" && typeof match.awayYellowCards === "number")
    out.push({ key: "yellow", label: "Yellow cards", home: match.homeYellowCards, away: match.awayYellowCards });
  if (typeof match.homeRedCards === "number" && typeof match.awayRedCards === "number")
    out.push({ key: "red", label: "Red cards", home: match.homeRedCards, away: match.awayRedCards });
  return out;
}
