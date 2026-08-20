"use client";

import { useSyncExternalStore } from "react";

// Whether the mobile search overlay is open — deliberately NOT routing
// (no navigation to /search, no URL change). Ephemeral UI state, not
// persisted, so a plain in-memory external store rather than the
// localStorage-backed pattern the rest of the app's client state uses
// (theme, sidebar collapse, saved items) — same useSyncExternalStore shape
// for consistency, just no storage layer under it.
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

export function useSearchOverlayOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function openSearchOverlay() {
  open = true;
  emit();
}

export function closeSearchOverlay() {
  open = false;
  emit();
}
