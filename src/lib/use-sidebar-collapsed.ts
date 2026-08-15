"use client";

import { useSyncExternalStore } from "react";

// The `.sidebar-collapsed` class on <html> is the external state (set by
// the same blocking script that applies `.light`, so there's no post-
// hydration snap — see layout.tsx and the --sidebar-width rule in
// globals.css). Same useSyncExternalStore pattern as ThemeToggle.
const EVENT = "rivaly-sidebar-change";
const STORAGE_KEY = "rivaly-sidebar-collapsed";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("sidebar-collapsed");
}

function getServerSnapshot() {
  return false;
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setSidebarCollapsed(collapsed: boolean) {
  document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
