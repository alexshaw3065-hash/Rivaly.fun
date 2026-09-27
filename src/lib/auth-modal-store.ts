"use client";
import { track } from "@/lib/analytics/track";

import { useSyncExternalStore } from "react";

// Every "sign in to continue" entry point in the app (the nav's "Sign up"
// button, a protected action's redirect, the /login route shim) calls
// openAuthModal() without needing a React context or being inside a
// particular provider tree — same module-level useSyncExternalStore
// pattern as quick-deposit-store.ts and search-overlay-store.ts. What
// actually opens is Dynamic's own prebuilt auth modal (setShowAuthFlow(true)
// in dynamic-provider.tsx) — this store's job is just carrying `next` (where
// to send the user once Dynamic confirms login) and `openId` (a trigger
// counter a watcher component reacts to) across to wherever Dynamic's hooks
// are actually available.
interface AuthModalState {
  next: string;
  error: string | null;
  openId: number;
}

let state: AuthModalState = { next: "/", error: null, openId: 0 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return state;
}

// A single stable reference, not a fresh object literal per call — this is
// what useSyncExternalStore's SSR path compares by identity, so returning a
// new object each time trips its "cache the server snapshot" warning.
const SERVER_SNAPSHOT: AuthModalState = { next: "/", error: null, openId: 0 };

function getServerSnapshot(): AuthModalState {
  return SERVER_SNAPSHOT;
}

export function useAuthModalState(): AuthModalState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function openAuthModal(opts?: { next?: string; error?: string | null }) {
  state = { next: opts?.next ?? "/", error: opts?.error ?? null, openId: state.openId + 1 };
  track("auth_modal_opened", { next: (opts?.next ?? "/").split("?")[0].slice(0, 60) });
  emit();
}

// Non-reactive read for handleAuthSuccess (dynamic-provider.tsx) — that
// runs in response to an event, not during render, so it needs the current
// "where was this login headed" value without subscribing via the hook.
export function getAuthModalNext(): string {
  return state.next;
}
