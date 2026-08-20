"use client";

import { useSyncExternalStore } from "react";

// Leagues you've joined via invite code, on top of the static memberIds
// already baked into mock-data.ts's predictionLeagues (the Global league,
// which everyone starts in). Same localStorage + useSyncExternalStore
// pattern as use-saved-items.ts / use-recent-searches.ts — mock-data.ts
// itself stays a plain data module with no browser APIs.
const STORAGE_KEY = "rivaly-joined-leagues";
const EVENT = "rivaly-joined-leagues-change";

const EMPTY: string[] = [];
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  const invalidate = () => {
    cache = null;
    callback();
  };
  window.addEventListener(EVENT, invalidate);
  window.addEventListener("storage", invalidate);
  return () => {
    window.removeEventListener(EVENT, invalidate);
    window.removeEventListener("storage", invalidate);
  };
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

export function useJoinedLeagueIds(): string[] {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export function joinLeague(id: string) {
  const current = read();
  if (!current.includes(id)) write([...current, id]);
}

// Leaving is exactly as easy as joining — one tap, no confirmation maze,
// no "are you sure" friction asymmetry (see the Arena plan's ethical
// guardrails).
export function leaveLeague(id: string) {
  write(read().filter((x) => x !== id));
}
