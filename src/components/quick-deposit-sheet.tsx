"use client";

import { useState } from "react";
import { depositToWallet } from "@/lib/use-wallet-balance";
import { useQuickDepositOpen, closeQuickDeposit } from "@/lib/quick-deposit-store";
import { BottomSheet } from "./bottom-sheet";

// Triggered by the "+" nested in the top bar's balance chip — a fast path
// to the same deposit the Wallet page and Profile's PNL card already
// offer, updating the same shared balance (see use-wallet-balance.ts) so
// the chip itself, /wallet, and Profile all move together. Mounted once at
// the Nav root (see nav.tsx) — not inside TopBarIcons — so this sheet's
// `position: fixed` isn't broken by the top bar's own backdrop-blur.
export function QuickDepositSheet() {
  const open = useQuickDepositOpen();
  const [amount, setAmount] = useState("");

  function confirm() {
    const naira = parseFloat(amount);
    if (!naira || naira <= 0) return;
    depositToWallet(Math.round(naira * 100));
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
          placeholder="Amount in ₦"
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
