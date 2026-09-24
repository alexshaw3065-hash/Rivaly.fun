"use client";

import { useSyncExternalStore } from "react";
import { foldMessage, levelsAt, newRace, type RaceSide, type RaceState, type Takeover } from "@/lib/room-race";

// The live stadium race for the open room, shared by the stadium, its
// takeover banner and the chat feed. The server folds the room's whole
// message log into a starting RaceState (room-race.ts); the chat then feeds
// every new backer message in with its server timestamp, so every phone
// holds the same race and agrees on who holds the stadium.
//
// Engagement mechanisms #4 (collective effervescence) and #5 (social
// identity/rivalry) — .claude/skills/rivaly-engagement-psychology.

const TICK_MS = 1000;

export interface RoomRace {
  levels: Record<RaceSide, number>;
  holder: RaceSide | null;
  takeovers: Takeover[];
}

let state: RaceState = newRace(0);
let snapshot: RoomRace = { levels: { yes: 0, no: 0 }, holder: null, takeovers: [] };
const listeners = new Set<() => void>();
let ticker: number | undefined;

function emit() {
  snapshot = { levels: levelsAt(state, Date.now()), holder: state.holder, takeovers: state.takeovers };
  listeners.forEach((l) => l());
}

/** Start from the server's fold of the room's history. */
export function initRace(initial: RaceState) {
  state = initial;
  emit();
}

/** A new message from a backer, at its server time. */
export function addRaceMessage(userId: string, side: RaceSide, at: number) {
  state = foldMessage(state, userId, side, at);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (ticker === undefined) {
    ticker = window.setInterval(() => {
      if (state.energy.yes === 0 && state.energy.no === 0) return;
      emit();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && ticker !== undefined) {
      window.clearInterval(ticker);
      ticker = undefined;
    }
  };
}

const SERVER: RoomRace = { levels: { yes: 0, no: 0 }, holder: null, takeovers: [] };

export function useRoomRace(): RoomRace {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER,
  );
}
