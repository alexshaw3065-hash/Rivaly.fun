"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";

// V1 deposit is "receive" only — show the wallet's own Solana address, let
// the user send USDC to it from anywhere (an exchange, another wallet,
// Circle's Devnet faucet during testing). No exchange-linking or connect-
// external-wallet picker in V1: pasting this address already covers "fund
// from a wallet you're already holding," and Dynamic's own connector for
// that isn't part of its public SDK surface (only used internally by its
// own prebuilt funding modal), so re-implementing it here would add
// complexity without adding real capability over copy-paste.
export function DepositSheet({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can be denied — the address is still selectable
      // text right above the button, so this never blocks the user.
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Deposit">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Send USDC on Solana to your Rivaly wallet address. It shows up here the moment it confirms
          on-chain — no waiting on Rivaly to process anything.
        </p>

        {address ? (
          <>
            <div className="rounded-md border border-border bg-surface-elevated px-3.5 py-3">
              <p className="break-all font-mono text-sm text-foreground">{address}</p>
            </div>
            <button
              onClick={copyAddress}
              className="rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background active:scale-[0.97]"
              style={{ transition: "transform 150ms ease-out" }}
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <p className="text-xs text-muted">
              Testing on Solana Devnet — get free test USDC from{" "}
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Circle&apos;s faucet
              </a>
              .
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Setting up your wallet address — try again in a moment.</p>
        )}
      </div>
    </BottomSheet>
  );
}
