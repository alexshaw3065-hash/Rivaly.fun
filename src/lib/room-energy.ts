"use client";

import { useSyncExternalStore } from "react";
import type { EntrySide } from "@/lib/types";

// Crowd energy per end of the room — the stadium's glow and the crowd-noise
// meter read it; the chat feeds it. Every message or reaction from someone
// who backed a side adds to that side; energy decays with a one-minute half
// life, so it's always "who's loud right now", never who was loud an hour
// ago. Spectators don't count. Only real messages ever add energy.
//
// Engagement mechanisms #4 (collective effervescence) and #5 (social
// identity/rivalry) — .claude/skills/rivaly-engagement-psychology: two ends
// of a ground trying to out-sing each other.

const HALF_LIFE_MS = 60_000;
const TICK_MS = 1000;
const FLOOR = 0.01;

export interface RoomEnergy {
  yes: number;
  no: number;
}

let yes = 0;
let no = 0;
let at = Date.now();
let snapshot: RoomEnergy = { yes: 0, no: 0 };
const listeners = new Set<() => void>();
let ticker: number | undefined;

const decayFactor = (ms: number) => Math.pow(0.5, Math.max(0, ms) / HALF_LIFE_MS);

function decay(now: number) {
  const k = decayFactor(now - at);
  yes *= k;
  no *= k;
  if (yes < FLOOR) yes = 0;
  if (no < FLOOR) no = 0;
  at = now;
}

function emit() {
  snapshot = { yes, no };
  listeners.forEach((l) => l());
}

/** One message or reaction from a backer of `side`, optionally in the past. */
export function addEnergy(side: EntrySide, amount = 1, when = Date.now()) {
  const now = Date.now();
  decay(now);
  const value = amount * decayFactor(now - when);
  if (side === "yes") yes += value;
  else no += value;
  emit();
}

/** A new room: start from silence. */
export function resetEnergy() {
  yes = 0;
  no = 0;
  at = Date.now();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (ticker === undefined) {
    ticker = window.setInterval(() => {
      if (yes === 0 && no === 0) return;
      decay(Date.now());
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

const SERVER: RoomEnergy = { yes: 0, no: 0 };

export function useRoomEnergy(): RoomEnergy {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER,
  );
}

/**
 * How loud the room is (0–1) and which end is winning. ~8 recent messages
 * from backers is a full house.
 */
export function readEnergy(e: RoomEnergy): { intensity: number; yesShare: number } {
  const total = e.yes + e.no;
  return {
    intensity: Math.min(1, total / 8),
    yesShare: total > 0 ? e.yes / total : 0.5,
  };
}
