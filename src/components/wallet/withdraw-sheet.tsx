"use client";

import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { BottomSheet } from "@/components/bottom-sheet";
import { USDC_MINT, USDC_DECIMALS, explorerTxUrl } from "@/lib/wallet/constants";
import { logWalletTransaction } from "@/lib/wallet/use-wallet-transactions";
import { formatUsdc } from "@/lib/wallet/format";

// Loose client-side sanity check (base58, right length) — not a substitute
// for real validation, just a friendlier failure than waiting on the chain
// to reject it. sendBalance() itself is the real gate.
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Calls Wallet.sendBalance() directly — a documented public method on
// Dynamic's own Wallet class — rather than Dynamic's prebuilt SendBalance
// modal, which lives outside the SDK's public export surface and would
// need its own additional provider wiring to use standalone. Same end
// result the plan called for (no Rivaly-side payout logic, user signs with
// their own embedded wallet), with a UI Rivaly fully controls.
export function WithdrawSheet({
  open,
  onClose,
  userId,
  usdcBalance,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  usdcBalance: number;
  onSuccess: () => void;
}) {
  const { primaryWallet } = useDynamicContext();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const amountNum = parseFloat(amount);
  const canSubmit =
    !!primaryWallet && SOLANA_ADDRESS_RE.test(toAddress) && amountNum > 0 && amountNum <= usdcBalance && !sending;

  function reset() {
    setToAddress("");
    setAmount("");
    setSending(false);
    setError(null);
    setSignature(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit() {
    if (!primaryWallet || !canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const sig = await primaryWallet.sendBalance({
        amount,
        toAddress,
        token: { address: USDC_MINT, decimals: USDC_DECIMALS },
      });
      if (!sig) throw new Error("No confirmation came back — check your wallet before retrying.");
      setSignature(sig);
      await logWalletTransaction({
        userId,
        type: "withdrawal",
        amountMicros: Math.round(amountNum * 10 ** USDC_DECIMALS),
        counterpartyAddress: toAddress,
        txSignature: sig,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdrawal failed — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Withdraw">
      {signature ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-foreground">Sent {formatUsdc(amountNum)} USDC.</p>
          <a
            href={explorerTxUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted underline hover:text-foreground"
          >
            View on Solana Explorer
          </a>
          <button
            onClick={handleClose}
            className="mt-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background active:scale-[0.97]"
            style={{ transition: "transform 150ms ease-out" }}
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value.trim())}
            placeholder="Destination Solana address"
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
          <div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount in USDC"
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 font-mono text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
              style={{ transition: "border-color 150ms ease" }}
            />
            <p className="mt-1 text-xs text-muted">Available: {formatUsdc(usdcBalance)}</p>
          </div>
          {error && <p className="text-xs text-danger-red">{error}</p>}
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background active:scale-[0.97] disabled:opacity-40"
            style={{ transition: "transform 150ms ease-out" }}
          >
            {sending ? "Sending…" : "Confirm withdrawal"}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
