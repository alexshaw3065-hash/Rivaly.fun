"use client";

import { useCurrentUser } from "@/components/current-user-provider";
import { WalletActions } from "@/components/wallet-actions";
import { WalletHistory } from "./wallet-history";

// The on-chain wallet behind a signed-in account. Signed-out visitors have
// no wallet, so this renders nothing rather than the seeded demo one.
export function SolanaWalletSection() {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <section className="mt-12 border-t border-border pt-8">
      <p className="font-display text-xl font-semibold text-foreground">Solana wallet</p>
      <p className="mt-1 text-sm text-muted">
        The on-chain wallet behind your account. Moving USDC from here into your Rivaly balance is coming next.
      </p>
      <div className="mt-5">
        <WalletActions />
      </div>
      <WalletHistory />
    </section>
  );
}
