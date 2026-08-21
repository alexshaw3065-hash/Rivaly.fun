"use client";

import { useSyncExternalStore } from "react";

// Whether the mobile top bar's "more" sheet is open. Ephemeral, in-memory
// — same shape as search-overlay-store.ts, and for the same underlying
// reason: the sheet must NOT be rendered as a DOM descendant of the sticky
// top bar (its `backdrop-blur-sm` creates a CSS containing block, which
// silently breaks the sheet's `position: fixed` so it only covers the nav
// bar's own height instead of the viewport). The trigger button lives in
// the nav bar; the actual sheet renders as a sibling at the Nav root.
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

export function useMoreMenuOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function openMoreMenu() {
  open = true;
  emit();
}

export function closeMoreMenu() {
  open = false;
  emit();
}
