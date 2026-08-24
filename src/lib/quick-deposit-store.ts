"use client";

import { useSyncExternalStore } from "react";

// Whether the top bar's quick-deposit sheet is open. Lives as its own
// store (not local state inside TopBarIcons) because the sheet itself has
// to be mounted at the Nav root, not inside TopBarIcons — TopBarIcons
// renders inside the top bar's backdrop-blur container, and `position:
// fixed` breaks inside a blurred (filtered) ancestor, clipping the sheet
// instead of covering the viewport. Same pattern as search-overlay-store.ts.
let open = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return open;
}

function getServerSnapshot() {
  return false;
}

export function useQuickDepositOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function openQuickDeposit() {
  open = true;
  emit();
}

export function closeQuickDeposit() {
  open = false;
  emit();
}
