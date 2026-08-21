"use client";

import { useSyncExternalStore } from "react";

// Whether the first-time "Introducing achievements!" explainer has been
// shown. Same boolean-via-localStorage + useSyncExternalStore pattern as
// use-sidebar-collapsed.ts, just without a DOM class to mirror it in
// (nothing else needs to read this synchronously before paint).
const STORAGE_KEY = "rivaly-achievements-intro-seen";
const EVENT = "rivaly-achievements-intro-change";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function useHasSeenAchievementsIntro(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function markAchievementsIntroSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
