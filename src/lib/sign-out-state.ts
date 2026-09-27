"use client";

// Shared state for the instant sign-out (use-sign-out.ts). Signing out used
// to await Dynamic's logout (network + tearing down the embedded wallet),
// then Supabase's server-side revoke, then two navigations — ~15s of a
// "Signing out…" button. Now the screen flips to signed-out immediately and
// the slow parts finish in the background. Two things make that safe:
//
// 1. A persisted "signed out" flag. While Dynamic's logout is still running,
//    Dynamic reports logged-in while Rivaly has no user — exactly what
//    DynamicAuthWatcher treats as "finish this person's sign-in". The flag
//    tells it to finish the LOGOUT instead, including after a reload or if
//    Dynamic's logout failed. It clears when Dynamic confirms the logout, or
//    when a genuine new sign-in happens (Dynamic's onAuthSuccess).
// 2. A hidden user id, so every useCurrentUser() consumer sees null at once,
//    before the server-rendered profile catches up.

const FLAG = "rvl-signed-out";

let hiddenUserId: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let dynamicLogout: Promise<void> | null = null;

export function beginSignOut(userId: string | null) {
  try {
    localStorage.setItem(FLAG, "1");
  } catch {}
  hiddenUserId = userId;
  emit();
}

/** True between a sign-out and Dynamic confirming it (survives reloads). */
export function signOutPending(): boolean {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return hiddenUserId !== null;
  }
}

/** A genuine new sign-in overrides any unfinished sign-out. */
export function clearSignOutFlag() {
  try {
    localStorage.removeItem(FLAG);
  } catch {}
}

/**
 * Runs Dynamic's logout once, however many callers ask at the same time
 * (the sign-out itself, the watcher after a reload). The flag stays set if
 * it fails, so the next page load tries again rather than signing back in.
 */
export function finishDynamicLogout(logOut: () => Promise<unknown>): Promise<void> {
  if (!dynamicLogout) {
    dynamicLogout = logOut()
      .then(() => clearSignOutFlag())
      .catch(() => undefined)
      .finally(() => {
        dynamicLogout = null;
      });
  }
  return dynamicLogout;
}

export function getHiddenUserId(): string | null {
  return hiddenUserId;
}

/** The server-rendered profile has caught up (it's null now) — stop hiding. */
export function releaseHiddenUser() {
  if (hiddenUserId === null) return;
  hiddenUserId = null;
  emit();
}

export function subscribeHiddenUser(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
