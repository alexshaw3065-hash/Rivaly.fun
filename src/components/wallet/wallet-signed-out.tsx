"use client";

import { Button, EmptyState } from "@/components/ui";
import { openAuthModal } from "@/lib/auth-modal-store";

// Wallet for someone who isn't signed in: say what's here and give the one
// way in, instead of a "—" balance and an empty history with nothing to do.
// Signing in comes straight back to /wallet.
export function WalletSignedOut() {
  return (
    <EmptyState
      className="py-20"
      title="Your wallet lives here"
      body="Sign in to see your balance, add money, and follow every stake and payout."
      action={
        <Button variant="primary" size="lg" onClick={() => openAuthModal({ next: "/wallet" })}>
          Sign in
        </Button>
      }
    />
  );
}
