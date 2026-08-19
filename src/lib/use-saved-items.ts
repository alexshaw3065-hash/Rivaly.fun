"use client";

import { useSyncExternalStore } from "react";

// Generalized wishlist store — rooms, matches, and search topics all save
// into the same {type, id} list instead of three separate localStorage
// keys, so the Wishlist page can render one list split by type. Same
// useSyncExternalStore pattern as the rest of the app's client persistence
// (theme, sidebar collapse) — models localStorage as an external store
// instead of useState+useEffect, and a custom event keeps every bookmark
// button and the Wishlist page in sync with each other.
export type SavedItemType = "room" | "match" | "topic";

export interface SavedItem {
  type: SavedItemType;
  id: string;
}

const STORAGE_KEY = "rivaly-saved-items";
const EVENT = "rivaly-saved-items-change";

const EMPTY: SavedItem[] = [];
// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing changed, or it re-renders forever — so this
// caches the parsed array and only re-parses after a real write.
let cache: SavedItem[] | null = null;

function read(): SavedItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as SavedItem[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(items: SavedItem[]) {
  cache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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

function getServerSnapshot(): SavedItem[] {
  return EMPTY;
}

export function useSavedItems(): SavedItem[] {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export function isSaved(items: SavedItem[], type: SavedItemType, id: string): boolean {
  return items.some((it) => it.type === type && it.id === id);
}

export function toggleSaved(type: SavedItemType, id: string) {
  const current = read();
  const exists = current.some((it) => it.type === type && it.id === id);
  const next = exists
    ? current.filter((it) => !(it.type === type && it.id === id))
    : [...current, { type, id }];
  write(next);
}
