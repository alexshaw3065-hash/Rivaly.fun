"use client";

import { useState } from "react";
import { useCurrentUser } from "./current-user-provider";
import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { formatUsdc } from "@/lib/wallet/format";
import { DepositSheet } from "./wallet/deposit-sheet";
import { WithdrawSheet } from "./wallet/withdraw-sheet";
import { WalletSetupButton } from "./wallet/wallet-setup-button";

// A live on-chain USDC balance and real deposit/withdraw flows through
// Dynamic + Solana. An account without a wallet yet gets the setup prompt
// instead — there is no demo balance.
export function WalletActions({
  centered = false,
  hideBalance = false,
}: {
  centered?: boolean;
  // Profile's PNL card already shows this same balance in its own "Total
  // cash" row right above — repeating it here would just be the identical
  // number printed twice. Wallet's own page still shows it (default false).
  hideBalance?: boolean;
}) {
  const profile = useCurrentUser();
  const live = useLiveWalletBalance();
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);

  if (!live.isReal) {
    return (
      <div className={centered ? "flex flex-col items-center text-center" : undefined}>
        {!hideBalance && (
          <>
            <p className="text-display font-display tabular-nums text-secondary">—</p>
            <p className="mb-4 mt-1 text-body text-secondary">Available balance</p>
          </>
        )}
        <WalletSetupButton next="/wallet" centered={centered} />
      </div>
    );
  }

  return (
    <div className={centered ? "flex flex-col items-center text-center" : undefined}>
      {!hideBalance && (
        <>
          <p className="text-display font-display tabular-nums text-foreground">
            {/* Never a confident "$0.00" before the first real read — see
                hasLoaded in wallet-context.tsx. */}
            {live.hasLoaded ? `${formatUsdc(live.usdcBalance)} USDC` : "—"}
          </p>
          <p className="mt-1 text-body text-secondary">Available balance</p>
        </>
      )}

      <div className={`flex gap-2 ${hideBalance ? "" : "mt-5"} ${centered ? "justify-center" : ""}`}>
        <button
          onClick={() => setMode(mode === "deposit" ? null : "deposit")}
          className="rounded-control bg-foreground px-5 py-3 text-body font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Deposit
        </button>
        <button
          onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
          className="rounded-control border border-line-strong px-5 py-3 text-body font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Withdraw
        </button>
      </div>

      {profile && (
        <>
          <DepositSheet open={mode === "deposit"} onClose={() => setMode(null)} />
          <WithdrawSheet
            open={mode === "withdraw"}
            onClose={() => setMode(null)}
            onSuccess={() => {
              live.refresh();
              setMode(null);
            }}
          />
        </>
      )}
    </div>
  );
}
