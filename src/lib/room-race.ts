// The stadium race: the room's two ends (YES backers, NO backers) pushing
// their end of the ground toward a takeover. Pure — no React, no Supabase —
// so the server and every phone fold the same message log the same way and
// agree on who holds the stadium. Unit-tested in room-race.test.ts.
//
// Rules (founder, 2026-09-24):
// - Energy comes from backers' messages and reactions; spectators don't count.
// - Distinct people count most: each message's weight falls with how many
//   that same person sent in the last minute, so one person hammering the
//   chat can't take the stadium alone — it takes a group.
// - Energy decays with a one-minute half-life (it's about who's loud now).
// - An end takes over when it reaches TAKEOVER_ENERGY and is louder than the
//   other end. It then HOLDS the stadium until the other side fights back
//   and takes it off them — quiet doesn't lose it, being out-shouted does.
// Social only: nothing here touches stakes or payouts.

export type RaceSide = "yes" | "no";

export const HALF_LIFE_MS = 60_000;
export const PERSON_WINDOW_MS = 60_000;
export const TAKEOVER_ENERGY = 4;

export interface Takeover {
  side: RaceSide;
  at: number;
}

export interface RaceState {
  /** Time the energies below are measured at (ms). */
  at: number;
  energy: Record<RaceSide, number>;
  /** Each backer's message times within the last minute — for diminishing returns. */
  recent: Record<string, number[]>;
  holder: RaceSide | null;
  takeovers: Takeover[];
}

export function newRace(at = 0): RaceState {
  return { at, energy: { yes: 0, no: 0 }, recent: {}, holder: null, takeovers: [] };
}

const decayFactor = (ms: number) => Math.pow(0.5, Math.max(0, ms) / HALF_LIFE_MS);

/** One backer's message at time `at` (server time). Messages are applied in order. */
export function foldMessage(state: RaceState, userId: string, side: RaceSide, at: number): RaceState {
  const t = Math.max(at, state.at); // never run the clock backwards
  const k = decayFactor(t - state.at);
  const energy = { yes: state.energy.yes * k, no: state.energy.no * k };

  const recent: Record<string, number[]> = {};
  for (const [id, times] of Object.entries(state.recent)) {
    const live = times.filter((x) => t - x < PERSON_WINDOW_MS);
    if (live.length) recent[id] = live;
  }
  const mine = recent[userId] ?? [];
  energy[side] += 1 / (1 + mine.length);
  recent[userId] = [...mine, t];

  let holder = state.holder;
  let takeovers = state.takeovers;
  const other: RaceSide = side === "yes" ? "no" : "yes";
  if (holder !== side && energy[side] >= TAKEOVER_ENERGY && energy[side] > energy[other]) {
    holder = side;
    takeovers = [...takeovers, { side, at: t }];
  }
  return { at: t, energy, recent, holder, takeovers };
}

/** Fold a whole log (any order) — what the server does on page load. */
export function raceFrom(messages: { userId: string; side: RaceSide; at: number }[], start = 0): RaceState {
  return [...messages].sort((a, b) => a.at - b.at || a.userId.localeCompare(b.userId) || a.side.localeCompare(b.side)).reduce((s, m) => foldMessage(s, m.userId, m.side, m.at), newRace(start));
}

/** How loud each end is right now, 0–1 (1 = takeover level). */
export function levelsAt(state: RaceState, now: number): Record<RaceSide, number> {
  const k = decayFactor(now - state.at);
  return {
    yes: Math.min(1, (state.energy.yes * k) / TAKEOVER_ENERGY),
    no: Math.min(1, (state.energy.no * k) / TAKEOVER_ENERGY),
  };
}
