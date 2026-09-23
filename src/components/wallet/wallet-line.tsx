"use client";

import { formatMoney } from "@/lib/mock-data";
import { openQuickDeposit } from "@/lib/quick-deposit-store";

// Circle's own devnet USDC faucet — where test money comes from while
// Rivaly runs on Solana devnet (the mint in src/lib/wallet/constants.ts).
const FAUCET_URL = "https://faucet.circle.com/";

/**
 * "Wallet $X free to stake", under the stake. When the stake doesn't fit,
 * the fix is right there: open the same receive sheet as the top-bar "+"
 * (address + QR), or go grab devnet USDC from the faucet. Renders nothing
 * for signed-out visitors — the primary button already says what's next.
 */
export function WalletLine({
  needCents,
  signedIn,
  availableCents,
  hasLoaded,
}: {
  needCents: number;
  signedIn: boolean;
  availableCents: number | null;
  hasLoaded: boolean;
}) {
  if (!signedIn) return null;
  const short = hasLoaded && availableCents !== null && availableCents < needCents;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <p className="text-sm">
        <span className="text-muted">Wallet </span>
        <span className="font-mono font-semibold text-foreground">
          {hasLoaded && availableCents !== null ? formatMoney(availableCents) : "…"}
        </span>
        <span className="text-muted"> free to stake</span>
        {short && <span className="ml-1.5 text-xs text-danger-red">Not enough for this stake</span>}
      </p>
      {short && (
        <span className="flex items-center gap-3">
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="hover-link text-xs text-muted underline underline-offset-2">
            Devnet faucet
          </a>
          <button
            type="button"
            onClick={openQuickDeposit}
            className="inline-flex min-h-10 items-center rounded-md border border-rival-green px-3.5 text-sm font-semibold text-rival-green transition-[transform,background-color] duration-150 ease-out hover:bg-rival-green-dim active:scale-[0.97]"
          >
            Add USDC
          </button>
        </span>
      )}
    </div>
  );
}
