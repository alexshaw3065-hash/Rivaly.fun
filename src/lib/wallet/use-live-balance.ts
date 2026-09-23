"use client";

import { useWallet } from "./wallet-context";

export interface LiveWalletBalance {
  isReal: boolean;
  hasLoaded: boolean;
  usdcBalance: number;
  walletAddress: string | null;
  refresh: () => void;
}

// The signed-in user's live on-chain USDC (read once, app-wide, in
// wallet-context.tsx). `isReal` is false until the account has a wallet
// address — surfaces show a setup prompt then, never a stand-in balance.
export function useLiveWalletBalance(): LiveWalletBalance {
  const { isReal, address, usdcBalance, hasLoaded, refresh } = useWallet();
  return { isReal, hasLoaded, usdcBalance, walletAddress: address, refresh };
}
