"use client";

import { useDynamicContext, useTokenBalances } from "@dynamic-labs/sdk-react-core";
import { ChainEnum } from "@dynamic-labs/sdk-api-core";
import { useWalletBalance } from "@/lib/use-wallet-balance";
import type { Profile } from "@/lib/types";
import { USDC_MINT } from "./constants";

export interface LiveWalletBalance {
  // Real Dynamic users get a live on-chain read; the seeded mock roster
  // (profile.dynamicWalletAddress === null) keeps using the existing
  // shared in-memory balance exactly as before — see mock-vs-real
  // convention in the deposits/withdrawals plan.
  isReal: boolean;
  isLoading: boolean;
  mockBalanceCents: number;
  usdcBalance: number;
  walletAddress: string | null;
  refresh: () => void;
}

// The wallet is non-custodial: this never reads a Rivaly-owned balance
// column, only Dynamic's live view of the user's own on-chain USDC. Called
// unconditionally (React hook rules) regardless of whether the current
// profile is real or mock — useTokenBalances simply has nothing to fetch
// when there's no wallet address yet.
export function useLiveWalletBalance(profile: Profile | null): LiveWalletBalance {
  const isReal = profile?.dynamicWalletAddress != null;
  const { primaryWallet } = useDynamicContext();
  const mockBalanceCents = useWalletBalance();

  const { tokenBalances, isLoading, fetchAccountBalances } = useTokenBalances({
    accountAddress: primaryWallet?.address,
    chainName: ChainEnum.Sol,
    tokenAddresses: [USDC_MINT],
    includeNativeBalance: false,
  });

  const usdc = tokenBalances.find((t) => t.address === USDC_MINT);

  return {
    isReal,
    isLoading: isReal && isLoading,
    mockBalanceCents,
    usdcBalance: usdc?.balance ?? 0,
    walletAddress: primaryWallet?.address ?? null,
    refresh: () => void fetchAccountBalances(true),
  };
}
