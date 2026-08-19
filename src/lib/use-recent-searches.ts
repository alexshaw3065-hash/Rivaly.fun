"use client";

import { useSyncExternalStore } from "react";

// Recent search terms for the Search page's idle "rollup" state (Recents
// row). Same useSyncExternalStore + localStorage pattern as the rest of
// the app's client persistence — see use-saved-items.ts.
const STORAGE_KEY = "rivaly-recent-searches";
const EVENT = "rivaly-recent-searches-change";
const MAX_RECENTS = 8;

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

function write(terms: string[]) {
  cache = terms;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
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

export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

// Called when a search is "committed" (Enter, or blurring with text) —
// not on every keystroke, or the list would just be a typing log.
export function addRecentSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const current = read();
  const deduped = current.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  write([trimmed, ...deduped].slice(0, MAX_RECENTS));
}

export function removeRecentSearch(term: string) {
  write(read().filter((t) => t !== term));
}

export function clearRecentSearches() {
  write([]);
}
