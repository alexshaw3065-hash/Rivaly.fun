"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";

// The Rivaly balance — what a user can stake right now, in US cents. One
// module-level store (same useSyncExternalStore pattern as
// auth-modal-store.ts) so the top-bar chip, the wallet page, the create flow
// and the join panel all show the same number and update together the
// moment a stake or top-up lands, without each firing its own read.
interface BalanceState {
  userId: string | null;
  cents: number | null;
}

let state: BalanceState = { userId: null, cents: null };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const SERVER: BalanceState = { userId: null, cents: null };

function emit(next: BalanceState) {
  state = next;
  listeners.forEach((l) => l());
}

async function load(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("user_balances").select("balance_cents").eq("user_id", userId).maybeSingle();
  // No row yet = never moved money = $0, which is a real, known balance.
  emit({ userId, cents: data?.balance_cents ?? 0 });
}

/** Re-read from the server — after anything that moved money. */
export function refreshRivalyBalance(): Promise<void> {
  if (!state.userId) return Promise.resolve();
  inFlight ??= load(state.userId).finally(() => (inFlight = null));
  return inFlight;
}

/** Set the balance the server just returned, without another round trip. */
export function setRivalyBalance(cents: number) {
  if (state.userId) emit({ ...state, cents });
}

export function useRivalyBalance(): { cents: number | null; hasLoaded: boolean } {
  const user = useCurrentUser();
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );

  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId === state.userId) return;
    emit({ userId, cents: null });
    if (userId) void refreshRivalyBalance();
  }, [user?.id]);

  const mine = snap.userId === (user?.id ?? null);
  return { cents: mine ? snap.cents : null, hasLoaded: mine && snap.cents !== null };
}
