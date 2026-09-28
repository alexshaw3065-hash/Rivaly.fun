"use client";

import { useSyncExternalStore } from "react";

// The one place the app reads Dynamic (sign-in + wallets) from — WITHOUT
// importing Dynamic's SDK. The SDK is ~740KB compressed (2.8MB of code); on a
// slow 4G phone it held the whole app for 20–40s because nothing could
// hydrate until it arrived. Now it loads on its own (components/dynamic-
// runtime.tsx, mounted by DynamicProvider) and publishes into this small
// store; everything else — wallet state, staking, withdrawing, sign-out —
// reads the store and waits for "ready" only when it actually needs to sign.

/** A wallet that can sign, as the rest of the app needs it. */
export interface BridgeWallet {
  address: string;
  isSolana: boolean;
  getSigner(): Promise<{ signTransaction(tx: unknown): Promise<{ serialize(opts: { requireAllSignatures: boolean; verifySignatures: boolean }): Uint8Array }> }>;
  sendBalance(args: { amount: string; toAddress: string; token?: { address: string; decimals: number } }): Promise<string | undefined>;
}

export interface DynamicState {
  /** idle: not asked for yet · loading: downloading/starting · ready: signed-in state is known · failed: couldn't load. */
  load: "idle" | "loading" | "ready" | "failed";
  loggedIn: boolean;
  wallets: BridgeWallet[];
  userId: string | null;
  /** Addresses on the Dynamic user's verified credentials (account-switch check). */
  credentialAddresses: string[];
}

export interface DynamicActions {
  logOut(): Promise<void>;
  refreshAuth(): Promise<unknown>;
  refreshUser(): Promise<unknown>;
  getAuthToken(): string | undefined;
}

const INITIAL: DynamicState = { load: "idle", loggedIn: false, wallets: [], userId: null, credentialAddresses: [] };
let state: DynamicState = INITIAL;
let actions: DynamicActions | null = null;
const listeners = new Set<() => void>();
const readyWaiters = new Set<(a: DynamicActions) => void>();

function emit() {
  listeners.forEach((l) => l());
  if (state.load === "ready" && actions) {
    const a = actions;
    readyWaiters.forEach((w) => w(a));
    readyWaiters.clear();
  }
}

/** Start loading the SDK (no-op if it's already loading or loaded). A failed load is retried. */
export function requestDynamic() {
  if (state.load === "idle" || state.load === "failed") {
    state = { ...state, load: "loading" };
    emit();
  }
}

/** Called by the runtime once the SDK is up, and whenever its state changes. */
export function publishDynamic(next: Omit<DynamicState, "load">, acts: DynamicActions) {
  actions = acts;
  state = { ...next, load: "ready" };
  emit();
}

export function markDynamicFailed() {
  state = { ...state, load: "failed" };
  emit();
}

export function getDynamicState(): DynamicState {
  return state;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDynamicState(): DynamicState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}

/** Resolves once the SDK is ready (asking for it if nobody has yet); rejects after `ms`. */
export function whenDynamicReady(ms = 60_000): Promise<DynamicActions> {
  requestDynamic();
  if (state.load === "ready" && actions) return Promise.resolve(actions);
  return new Promise((resolve, reject) => {
    const done = (a: DynamicActions) => {
      window.clearTimeout(timer);
      resolve(a);
    };
    const timer = window.setTimeout(() => {
      readyWaiters.delete(done);
      reject(new Error("wallet_unavailable"));
    }, ms);
    readyWaiters.add(done);
  });
}

/** Dynamic's actions, usable before the SDK has loaded (they wait for it). */
export const dynamic = {
  logOut: async () => (await whenDynamicReady()).logOut(),
  refreshAuth: async () => (await whenDynamicReady()).refreshAuth(),
  refreshUser: async () => (await whenDynamicReady()).refreshUser(),
  getAuthToken: () => actions?.getAuthToken(),
};
