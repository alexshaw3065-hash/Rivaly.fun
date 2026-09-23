"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { reconcileWalletTransactions } from "./reconcile";

export interface WalletTransactionRow {
  id: string;
  type: "deposit" | "withdrawal";
  amountMicros: number;
  counterpartyAddress: string | null;
  txSignature: string;
  createdAt: string;
}

// The history list and the balance live in separate components, so a
// withdrawal completing in one has to tell the other to re-read. Same
// window-event convention used elsewhere rather than a second
// state-management approach.
const CHANGED_EVENT = "rivaly-wallet-transactions-change";

export function notifyWalletTransactionsChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

// Client-side, not a server action: RLS's own "insert your own row" policy
// is the whole authorization story here, same pattern already used for
// messages/entries — see the wallet_transactions migration.
export async function logWalletTransaction(params: {
  userId: string;
  type: "deposit" | "withdrawal";
  amountMicros: number;
  counterpartyAddress: string | null;
  txSignature: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("wallet_transactions").insert({
    user_id: params.userId,
    type: params.type,
    amount_micros: params.amountMicros,
    counterparty_address: params.counterpartyAddress,
    tx_signature: params.txSignature,
  });
}

export function useWalletTransactions(profile: Profile | null) {
  const isReal = profile?.dynamicWalletAddress != null;
  const [rows, setRows] = useState<WalletTransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(isReal);

  const load = useCallback(async (userId: string, reconcile = false) => {
    // Catch the log up to the chain first, so a deposit sent straight to the
    // receive address (no app-side callback to hook a row onto) still shows
    // up here. Best-effort: a failed reconcile just means the read below
    // returns what's already logged.
    if (reconcile) {
      try {
        await reconcileWalletTransactions();
      } catch {
        // Balance is read independently and stays correct regardless.
      }
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount_micros, counterparty_address, tx_signature, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setRows(
      (data ?? []).map((r) => ({
        id: r.id as string,
        type: r.type as "deposit" | "withdrawal",
        amountMicros: r.amount_micros as number,
        counterpartyAddress: r.counterparty_address as string | null,
        txSignature: r.tx_signature as string,
        createdAt: r.created_at as string,
      })),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isReal || !profile) return;
    // One-shot fetch on mount/profile-change, reconciling against the chain
    // first — no data-fetching library is installed in this project yet, so
    // this is the standard React pattern (fetch, then setState once it
    // resolves). The lint rule can't see that load()'s own setState calls
    // happen after its internal await, only that load() is reachable here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(profile.id, true);
  }, [isReal, profile, load]);

  // Re-read when something elsewhere in the app logs a transaction. setState
  // inside a listener callback is exactly the subscribe-to-an-external-system
  // shape effects are meant for, so nothing to work around here.
  useEffect(() => {
    if (!isReal || !profile) return;
    const onChanged = () => void load(profile.id, true);
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHANGED_EVENT, onChanged);
  }, [isReal, profile, load]);

  // Called from user-triggered event handlers (e.g. after a withdrawal
  // completes), never from an effect body — safe to set state synchronously
  // here.
  const refresh = useCallback(() => {
    if (!profile) return;
    setIsLoading(true);
    void load(profile.id, true);
  }, [profile, load]);

  if (!isReal) {
    return { isReal: false as const, transactions: [] as WalletTransactionRow[], isLoading: false, refresh: () => {} };
  }

  return { isReal: true as const, transactions: rows, isLoading, refresh };
}
