"use client";

import { useCurrentUser } from "@/components/current-user-provider";
import { useWallet } from "./wallet-context";

/**
 * What the signed-in user can stake: their embedded wallet's devnet USDC
 * (the same live read as the top-bar chip). Staked money has already moved
 * into escrow, so there's nothing to subtract. The server re-checks before
 * building any stake — this only lets the UI say "not enough" early.
 */
export function useStakeable(): { availableCents: number | null; hasLoaded: boolean; refresh: () => void } {
  const user = useCurrentUser();
  const wallet = useWallet();
  const hasLoaded = Boolean(user && wallet.isReal && wallet.hasLoaded);
  return {
    availableCents: hasLoaded ? Math.floor(wallet.usdcBalance * 100 + 1e-6) : null,
    hasLoaded,
    refresh: wallet.refresh,
  };
}
