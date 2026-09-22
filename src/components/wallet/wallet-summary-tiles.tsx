"use client";

import { wallet, formatMoney } from "@/lib/mock-data";
import { useWallet } from "@/lib/wallet/wallet-context";

// "Pending" and "escrow" don't have a real meaning yet for a non-custodial
// crypto wallet — escrow belongs to room settlement (its own separate,
// not-yet-built effort) and Solana's near-instant finality makes a
// distinct pending step mostly unnecessary. Dropped for real users rather
// than faked; the seeded mock roster keeps seeing them exactly as before.
export function WalletSummaryTiles() {
  const { isReal } = useWallet();
  if (isReal) return null;

  return (
    <div className="mt-8 grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="font-mono text-lg font-medium text-foreground">{formatMoney(wallet.pendingCents)}</p>
        <p className="mt-0.5 text-xs text-muted">Pending</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="font-mono text-lg font-medium text-foreground">{formatMoney(wallet.escrowCents)}</p>
        <p className="mt-0.5 text-xs text-muted">In escrow · active rooms</p>
      </div>
    </div>
  );
}
