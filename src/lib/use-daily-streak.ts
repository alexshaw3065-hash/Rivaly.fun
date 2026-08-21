"use client";

import { useSyncExternalStore } from "react";

// A real daily check-in streak — counts actual calendar days the app was
// opened, persisted in localStorage. Same JSON-object pattern as
// use-joined-leagues.ts. Reading (useDailyStreak) and mutating
// (checkInToday) are kept separate so the one mutation-on-app-open lives
// in a useEffect (see the <StreakTracker/> mount in nav.tsx), not during
// render.
interface StreakState {
  lastVisitDate: string; // YYYY-MM-DD
  streak: number;
}

const STORAGE_KEY = "rivaly-daily-streak";
const EVENT = "rivaly-daily-streak-change";
const EMPTY: StreakState = { lastVisitDate: "", streak: 0 };

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function read(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StreakState) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(state: StreakState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): number {
  return read().streak;
}

function getServerSnapshot(): number {
  return 0;
}

export function useDailyStreak(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Yesterday → streak continues (+1). Today already recorded → no-op.
// Any bigger gap → streak resets to 1. Real calendar-day math, not a
// decorative counter.
export function checkInToday() {
  const today = dateKey(new Date());
  const state = read();
  if (state.lastVisitDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const nextStreak = state.lastVisitDate === dateKey(yesterday) ? state.streak + 1 : 1;
  write({ lastVisitDate: today, streak: nextStreak });
}
