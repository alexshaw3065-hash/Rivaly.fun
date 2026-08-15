"use client";

import { useSyncExternalStore } from "react";

// Client-only persistence (no backend yet) for the bookmark/wishlist toggle
// on room cards. Same useSyncExternalStore pattern as ThemeToggle — models
// localStorage as an external store instead of useState+useEffect, and a
// custom event keeps every card and the Wishlist page in sync with each
// other without prop-drilling.
const STORAGE_KEY = "rivaly-saved-rooms";
const EVENT = "rivaly-saved-rooms-change";

const EMPTY: string[] = [];
// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing changed, or it re-renders forever — so this
// caches the parsed array and only re-parses after a real write.
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

export function useSavedRoomIds(): string[] {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export function toggleSavedRoom(roomId: string) {
  const current = read();
  const next = current.includes(roomId)
    ? current.filter((id) => id !== roomId)
    : [...current, roomId];
  write(next);
}
