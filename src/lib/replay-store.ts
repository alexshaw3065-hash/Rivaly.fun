"use client";

import { useSyncExternalStore } from "react";

// While someone drags the room's timeline back (or replays it), the stadium's
// scoreboard shows the score at that moment and the minute — the timeline
// publishes here, the scoreboard reads. Keyed by match; null = live.

export interface ReplayMoment {
  score: { home: number; away: number };
  /** "30'" (soccer) · "Q2 8:26" (NFL). */
  label: string;
}

const moments = new Map<string, ReplayMoment | null>();
const listeners = new Set<() => void>();

export function setReplay(matchId: string, moment: ReplayMoment | null) {
  const prev = moments.get(matchId) ?? null;
  if (prev === moment) return;
  if (prev && moment && prev.label === moment.label && prev.score.home === moment.score.home && prev.score.away === moment.score.away) return;
  moments.set(matchId, moment);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useReplay(matchId: string): ReplayMoment | null {
  return useSyncExternalStore(
    subscribe,
    () => moments.get(matchId) ?? null,
    () => null,
  );
}
