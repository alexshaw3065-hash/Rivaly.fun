"use client";

import { useWalletBalance } from "@/lib/use-wallet-balance";
import { useWallet } from "./wallet-context";

export interface LiveWalletBalance {
  isReal: boolean;
  hasLoaded: boolean;
  mockBalanceCents: number;
  usdcBalance: number;
  walletAddress: string | null;
  refresh: () => void;
}

// Merges the two worlds every wallet surface has to render: a real
// Dynamic-backed user's live on-chain USDC (read once, app-wide, in
// wallet-context.tsx) and the seeded mock roster's existing shared
// in-memory balance. Consumers branch on `isReal`.
export function useLiveWalletBalance(): LiveWalletBalance {
  const { isReal, address, usdcBalance, hasLoaded, refresh } = useWallet();
  const mockBalanceCents = useWalletBalance();

  return { isReal, hasLoaded, mockBalanceCents, usdcBalance, walletAddress: address, refresh };
}
