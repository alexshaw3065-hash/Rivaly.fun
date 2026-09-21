"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/mock-data";
import { useWalletBalance, depositToWallet, withdrawFromWallet } from "@/lib/use-wallet-balance";
import { useCurrentUser } from "./current-user-provider";
import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { formatUsdc } from "@/lib/wallet/format";
import { DepositSheet } from "./wallet/deposit-sheet";
import { WithdrawSheet } from "./wallet/withdraw-sheet";

// Real users (profile.dynamicWalletAddress set) get a live on-chain USDC
// balance and real deposit/withdraw flows through Dynamic + Solana — see
// the deposits/withdrawals plan. The seeded mock roster keeps the original
// optimistic-local-state behavior unchanged below.
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
  const live = useLiveWalletBalance(profile);
  const mockBalance = useWalletBalance();
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);
  const [amount, setAmount] = useState("");

  function confirmMock() {
    const naira = parseFloat(amount);
    if (!naira || naira <= 0) return;
    const cents = Math.round(naira * 100);
    if (mode === "deposit") depositToWallet(cents);
    else withdrawFromWallet(cents);
    setMode(null);
    setAmount("");
  }

  return (
    <div className={centered ? "flex flex-col items-center text-center" : undefined}>
      {!hideBalance && (
        <>
          <p className="font-mono text-4xl font-medium text-foreground md:text-5xl">
            {live.isReal ? `${formatUsdc(live.usdcBalance)} USDC` : formatMoney(mockBalance)}
          </p>
          <p className="mt-1 text-sm text-muted">Available balance</p>
        </>
      )}

      <div className={`flex gap-2 ${hideBalance ? "" : "mt-5"} ${centered ? "justify-center" : ""}`}>
        <button
          onClick={() => setMode(mode === "deposit" ? null : "deposit")}
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Deposit
        </button>
        <button
          onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
          className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Withdraw
        </button>
      </div>

      {!live.isReal && mode && (
        <div className={`mt-3 flex items-center gap-2 ${centered ? "justify-center" : ""}`}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0"
            placeholder="Amount in ₦"
            className="w-40 rounded-md border border-border bg-surface px-3.5 py-2.5 font-mono text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
          <button
            onClick={confirmMock}
            className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Confirm {mode}
          </button>
        </div>
      )}

      {live.isReal && profile && (
        <>
          <DepositSheet
            open={mode === "deposit"}
            onClose={() => setMode(null)}
            address={live.walletAddress}
          />
          <WithdrawSheet
            open={mode === "withdraw"}
            onClose={() => setMode(null)}
            userId={profile.id}
            usdcBalance={live.usdcBalance}
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
