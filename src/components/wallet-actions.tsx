"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/mock-data";
import { useWalletBalance, depositToWallet, withdrawFromWallet } from "@/lib/use-wallet-balance";

// Deposit/withdraw update the shared balance store optimistically — no
// payment rail is wired up yet. Swap for a real provider call (see
// docs/masterplan/09-competitive-research.md#5.2c — local payment
// infrastructure, not crypto complexity, should sit behind this button).
// Every instance of this component (Wallet page, Profile's PNL card, the
// top bar's quick-deposit) reads the same balance, so a deposit anywhere
// shows up everywhere.
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
  const balance = useWalletBalance();
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);
  const [amount, setAmount] = useState("");

  function confirm() {
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
            {formatMoney(balance)}
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

      {mode && (
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
            onClick={confirm}
            className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Confirm {mode}
          </button>
        </div>
      )}
    </div>
  );
}
