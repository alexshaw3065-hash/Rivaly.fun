// The room's Lineup tab: TxLINE's "lineups" action (sent about 25 minutes
// before kick-off) → both teams in shape, with what each player did as the
// match went — goals, cards, coming on and going off — read from the same
// event stream, where players are named by id. Pure — tested in
// match-lineups.test.ts.
//
// The feed gives each player a unit (GK / DEF / MID / FWD), not a spot on the
// pitch, so the shape is built from those lines and the formation is their
// count ("4-4-2"). Left-to-right order within a line isn't in the feed, so
// it follows shirt numbers rather than pretending to know.
//
// No imports at all: the TxLINE normaliser (also built by the standalone
// worker, under a stricter config) imports StoredLineupTeam from here.

/** The slice of a stored match event this reads (an EventRow fits). */
interface EventRow {
  action: string;
  minute: number | null;
  payload: Record<string, unknown> | null;
}

export type LineupPosition = "GK" | "DEF" | "MID" | "FWD";

/** What normalizeEvents() stores on a "lineups" row, per team. */
export interface StoredLineupTeam {
  name: string;
  players: { id: number; name: string; surname: string; number: string; pos: LineupPosition; starter: boolean }[];
}

export interface LineupPlayer {
  id: number;
  name: string;
  surname: string;
  number: string;
  pos: LineupPosition;
  goals: number;
  ownGoals: number;
  yellow: number;
  red: boolean;
  /** Minute they came on / went off, when they did. */
  on: number | null;
  off: number | null;
}

export interface TeamLineup {
  name: string;
  formation: string;
  /** Goalkeeper first, forwards last. */
  lines: LineupPlayer[][];
  bench: LineupPlayer[];
}

export interface MatchLineups {
  home: TeamLineup;
  away: TeamLineup;
}

const ORDER: LineupPosition[] = ["GK", "DEF", "MID", "FWD"];
const shirt = (p: { number: string }) => Number.parseInt(p.number, 10) || 99;
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

/** The latest line-ups in the rows, or null before they're out. Rows should already be collapsed (collapseEvents). */
export function buildLineups(rows: EventRow[], homeTeam: string, awayTeam: string): MatchLineups | null {
  const row = [...rows].reverse().find((r) => r.action === "lineups" && Array.isArray(r.payload?.teams));
  if (!row) return null;
  const teams = row.payload!.teams as StoredLineupTeam[];
  if (teams.length !== 2) return null;

  // Team names come from the same provider as the match's; fall back to the
  // feed's order (home first) if one ever differs.
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const swap = same(teams[1].name, homeTeam) || same(teams[0].name, awayTeam);
  const [homeRaw, awayRaw] = swap ? [teams[1], teams[0]] : [teams[0], teams[1]];

  const players = new Map<number, LineupPlayer & { starter: boolean }>();
  for (const t of [homeRaw, awayRaw])
    for (const p of t.players) players.set(p.id, { ...p, goals: 0, ownGoals: 0, yellow: 0, red: false, on: null, off: null });

  // What each player did. Substitutions are checked against who's actually
  // on: the feed sometimes amends one the wrong way round first and corrects
  // it later, and "a starter came on" can't be true.
  const onPitch = new Set([...players.values()].filter((p) => p.starter).map((p) => p.id));
  const events = rows
    .filter((r) => r.action !== "lineups")
    .map((r) => ({ r, minute: r.minute ?? 0 }))
    .sort((a, b) => a.minute - b.minute);
  for (const { r, minute } of events) {
    const p = r.payload ?? {};
    const who = players.get(num(p.PlayerId) ?? -1);
    if (r.action === "goal" && who) {
      if (p.GoalType === "Own" || p.GoalType === "OwnGoal") who.ownGoals++;
      else who.goals++;
    } else if (r.action === "yellow_card" && who) {
      who.yellow++;
    } else if (r.action === "red_card" && who) {
      who.red = true;
    } else if (r.action === "substitution") {
      const into = players.get(num(p.PlayerInId) ?? -1);
      const out = players.get(num(p.PlayerOutId) ?? -1);
      if (!into || !out || onPitch.has(into.id) || !onPitch.has(out.id) || into.on !== null) continue;
      into.on = minute;
      out.off = minute;
      onPitch.delete(out.id);
      onPitch.add(into.id);
    }
  }

  const team = (raw: StoredLineupTeam): TeamLineup => {
    const mine = raw.players.map((p) => players.get(p.id)!);
    const starters = mine.filter((p) => p.starter);
    const lines = ORDER.map((pos) => starters.filter((p) => p.pos === pos).sort((a, b) => shirt(a) - shirt(b))).filter((l) => l.length > 0);
    const outfield = lines.filter((l) => l[0].pos !== "GK").map((l) => l.length);
    const bench = mine
      .filter((p) => !p.starter)
      // Those who came on first, in the order they did; then the rest by shirt.
      .sort((a, b) => (a.on ?? 999) - (b.on ?? 999) || shirt(a) - shirt(b));
    return { name: raw.name, formation: outfield.join("-"), lines: lines.map((l) => l.map(strip)), bench: bench.map(strip) };
  };
  return { home: team(homeRaw), away: team(awayRaw) };
}

function strip(p: LineupPlayer & { starter: boolean }): LineupPlayer {
  const { starter: _starter, ...rest } = p;
  void _starter;
  return rest;
}

/** Player id → the name to show on a timeline moment or feed line ("Cunha", "Smith Rowe"). */
export function playerNames(rows: EventRow[]): Record<number, string> {
  const row = [...rows].reverse().find((r) => r.action === "lineups" && Array.isArray(r.payload?.teams));
  const out: Record<number, string> = {};
  if (!row) return out;
  for (const t of row.payload!.teams as StoredLineupTeam[]) for (const p of t.players) out[p.id] = p.surname;
  return out;
}
