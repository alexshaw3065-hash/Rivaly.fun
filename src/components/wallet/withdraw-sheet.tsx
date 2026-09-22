"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { USDC_MINT, USDC_DECIMALS, MIN_SOL_FOR_WITHDRAWAL, explorerTxUrl } from "@/lib/wallet/constants";
import { logWalletTransaction, notifyWalletTransactionsChanged } from "@/lib/wallet/use-wallet-transactions";
import { formatUsdc } from "@/lib/wallet/format";
import { useWallet } from "@/lib/wallet/wallet-context";

// Loose client-side sanity check (base58, right length) — not a substitute
// for real validation, just a friendlier failure than waiting on the chain
// to reject it. The transfer itself is the real gate.
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Raw RPC/wallet errors are unreadable ("Attempt to debit an account but
// found no record of a prior credit", "blockhash not found"). Money moving
// is the worst place to hand someone a stack trace, so translate the ones
// that actually happen and keep the original only as a last resort.
function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("insufficient") || lower.includes("no record of a prior credit")) {
    return "Not enough balance to cover this transfer and its network fee.";
  }
  if (lower.includes("blockhash")) {
    return "That took too long to confirm — try again.";
  }
  if (lower.includes("reject") || lower.includes("denied") || lower.includes("cancel")) {
    return "Transfer cancelled.";
  }
  if (lower.includes("source token account not found")) {
    return "This wallet doesn't hold any USDC yet.";
  }
  return raw;
}

// Signs with the wallet matching the user's own Rivaly address (see
// wallet-context.tsx) — never just whichever wallet Dynamic marked
// primary, which for a user with a second connected wallet would send from
// the wrong place. Calls Wallet.sendBalance() directly: a documented public
// method that builds the SPL transfer, creates the recipient's token
// account if needed, and signs with the user's own key. No Rivaly-side
// payout logic, and Rivaly is never in the money path.
export function WithdrawSheet({
  open,
  onClose,
  userId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}) {
  const { signingWallet, usdcBalance, solBalance, hasLoaded } = useWallet();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const amountNum = parseFloat(amount);
  const needsSol = hasLoaded && solBalance < MIN_SOL_FOR_WITHDRAWAL;
  const canSubmit =
    !!signingWallet &&
    hasLoaded &&
    SOLANA_ADDRESS_RE.test(toAddress) &&
    amountNum > 0 &&
    amountNum <= usdcBalance &&
    !sending;

  function handleClose() {
    setToAddress("");
    setAmount("");
    setSending(false);
    setError(null);
    setSignature(null);
    onClose();
  }

  async function submit() {
    if (!signingWallet || !canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const sig = await signingWallet.sendBalance({
        amount,
        toAddress,
        token: { address: USDC_MINT, decimals: USDC_DECIMALS },
      });
      if (!sig) throw new Error("No confirmation came back — check your wallet before retrying.");
      setSignature(sig);
      // Best-effort log: the transfer itself already succeeded on-chain, so
      // a failed insert must never read as a failed withdrawal.
      try {
        await logWalletTransaction({
          userId,
          type: "withdrawal",
          amountMicros: Math.round(amountNum * 10 ** USDC_DECIMALS),
          counterpartyAddress: toAddress,
          txSignature: sig,
        });
        notifyWalletTransactionsChanged();
      } catch {
        // History row missing is a cosmetic gap; the chain is the record.
      }
      onSuccess();
    } catch (e) {
      setError(readableError(e));
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
            <p className="mt-1 text-xs text-muted">
              Available: {hasLoaded ? `${formatUsdc(usdcBalance)} USDC` : "checking…"}
            </p>
          </div>

          {needsSol && (
            <p className="text-xs text-muted">
              Solana charges a small network fee in SOL, and this wallet has none yet — send a little
              SOL to your deposit address first, or this transfer will fail.
            </p>
          )}
          {!signingWallet && (
            <p className="text-xs text-muted">
              Your wallet needs to reconnect before it can sign. Sign out and back in, then try again.
            </p>
          )}
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
