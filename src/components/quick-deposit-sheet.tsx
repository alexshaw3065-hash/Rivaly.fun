"use client";

import { useState } from "react";
import { depositToWallet } from "@/lib/use-wallet-balance";
import { useQuickDepositOpen, closeQuickDeposit } from "@/lib/quick-deposit-store";
import { BottomSheet } from "./bottom-sheet";
import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { DepositSheet } from "./wallet/deposit-sheet";

// Triggered by the "+" nested in the top bar's balance chip — a fast path
// to the same deposit the Wallet page and Profile's PNL card already
// offer. Real users get the real receive-address sheet (see
// wallet-actions.tsx for the same branch); the mock roster keeps the
// original optimistic amount-entry form. Mounted once at the Nav root (see
// nav.tsx) — not inside TopBarIcons — so this sheet's `position: fixed`
// isn't broken by the top bar's own backdrop-blur.
export function QuickDepositSheet() {
  const open = useQuickDepositOpen();
  const live = useLiveWalletBalance();
  const [amount, setAmount] = useState("");

  if (live.isReal) {
    return <DepositSheet open={open} onClose={closeQuickDeposit} />;
  }

  function confirm() {
    const dollars = parseFloat(amount);
    if (!dollars || dollars <= 0) return;
    depositToWallet(Math.round(dollars * 100));
    setAmount("");
    closeQuickDeposit();
  }

  return (
    <BottomSheet open={open} onClose={closeQuickDeposit} title="Deposit">
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min="0"
          placeholder="Amount in USDC"
          className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 font-mono text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        <button
          onClick={confirm}
          className="rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background active:scale-[0.97]"
          style={{ transition: "transform 150ms ease-out" }}
        >
          Confirm deposit
        </button>
      </div>
    </BottomSheet>
  );
}
