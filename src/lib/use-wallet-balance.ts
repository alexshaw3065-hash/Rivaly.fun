"use client";

import { useSyncExternalStore } from "react";
import { wallet } from "./mock-data";

// A single reactive balance, shared by every place that shows or edits it
// (the top bar's quick-deposit, /wallet, Profile's PNL card) — without
// this, each WalletActions instance kept its own local state seeded from
// the same static wallet.balanceCents, so a deposit in one place silently
// didn't show up anywhere else. In-memory only (no localStorage), same as
// the local state it replaces — still resets on reload, no payment rail
// exists yet.
const EVENT = "rivaly-wallet-balance-change";
let balanceCents = wallet.balanceCents;

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot(): number {
  return balanceCents;
}

function getServerSnapshot(): number {
  return wallet.balanceCents;
}

export function useWalletBalance(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function depositToWallet(cents: number) {
  balanceCents += cents;
  window.dispatchEvent(new Event(EVENT));
}

export function withdrawFromWallet(cents: number) {
  balanceCents = Math.max(0, balanceCents - cents);
  window.dispatchEvent(new Event(EVENT));
}
