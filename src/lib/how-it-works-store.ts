"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/track";

// Opens the "How it works" sheet from anywhere (the menu, the desktop header,
// Home's first visit) — same module-level store pattern as auth-modal-store.ts.

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useHowItWorksOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}

export function openHowItWorks(source: "first_visit" | "menu" | "header" = "menu") {
  if (open) return;
  open = true;
  track("how_it_works_opened", { source });
  emit();
}

export function closeHowItWorks() {
  open = false;
  emit();
}

// Seen once = never opens by itself again on this browser. If storage is
// blocked we can't remember, so it doesn't open by itself at all rather than
// on every visit.
const SEEN_KEY = "rivaly-how-it-works-seen";
export function howItWorksSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}
export function markHowItWorksSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // nothing to do
  }
}
