"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useWallet } from "@/lib/wallet/wallet-context";

// While this sheet is open the user is actively mid-deposit, so it's worth
// paying for a read every few seconds — that's what makes "it shows up the
// moment it confirms" true rather than a promise the UI doesn't keep.
// Passed to setInterval as a reference, so the balance update happens in a
// timer callback rather than synchronously inside the effect.
const POLL_MS = 6000;

// V1 deposit is "receive" only — show the wallet's own Solana address and
// let the user send USDC to it from anywhere (an exchange, another wallet,
// Circle's Devnet faucet while testing). No exchange-linking or
// connect-external-wallet picker: pasting this address already covers
// "fund from a wallet you're already holding," and Dynamic's own connector
// for that isn't part of its public SDK surface.
export function DepositSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, refresh } = useWallet();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !address) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [open, address, refresh]);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can be denied — the address is still
      // selectable text right above the button, so this never blocks.
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
          // Only reachable when the profile genuinely has no wallet address
          // yet — Dynamic hadn't finished provisioning the embedded wallet
          // at the last sign-in. Each login re-checks and fills it in (see
          // dynamic-actions.ts), so signing out and back in is the actual
          // fix rather than waiting.
          <p className="text-sm text-muted">
            Your wallet isn&apos;t ready yet. Sign out and back in — that finishes setting it up.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
