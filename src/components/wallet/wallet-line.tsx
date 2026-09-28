"use client";

import { formatMoney } from "@/lib/mock-data";
import { openQuickDeposit } from "@/lib/quick-deposit-store";

// Circle's own devnet USDC faucet — where test money comes from while
// Rivaly runs on Solana devnet (the mint in src/lib/wallet/constants.ts).
const FAUCET_URL = "https://faucet.circle.com/";

/**
 * "Wallet $X USDC", under the stake. When the stake doesn't fit,
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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface px-4 py-3 edge">
      <p className="text-body">
        <span className="text-secondary">Wallet </span>
        <span className="font-semibold tabular-nums text-foreground">
          {hasLoaded && availableCents !== null ? formatMoney(availableCents) : "…"}
        </span>
        <span className="text-secondary"> USDC</span>
        {short && <span className="ml-1.5 text-caption text-no-ink">Not enough for this stake</span>}
      </p>
      {short && (
        <span className="flex items-center gap-3">
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="hover-link text-caption text-secondary underline underline-offset-2">
            Devnet faucet
          </a>
          <button
            type="button"
            onClick={openQuickDeposit}
            className="inline-flex h-10 items-center rounded-control px-3 text-label font-semibold text-money-ink outline outline-1 -outline-offset-1 outline-money transition-[transform,background-color] duration-100 ease-out hover:bg-money-tint active:scale-[0.97]"
          >
            Add USDC
          </button>
        </span>
      )}
    </div>
  );
}
