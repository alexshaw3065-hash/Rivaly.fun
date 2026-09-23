"use client";

import { useQuickDepositOpen, closeQuickDeposit } from "@/lib/quick-deposit-store";
import { BottomSheet } from "./bottom-sheet";
import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { DepositSheet } from "./wallet/deposit-sheet";
import { WalletSetupButton } from "./wallet/wallet-setup-button";

// Triggered by the "+" nested in the top bar's balance chip — a fast path
// to the same deposit the Wallet page and Profile's PNL card already
// offer. Real users get the real receive-address sheet (see
// wallet-actions.tsx for the same branch); an account without a
// wallet yet gets the setup prompt instead. Mounted once at the Nav root (see
// nav.tsx) — not inside TopBarIcons — so this sheet's `position: fixed`
// isn't broken by the top bar's own backdrop-blur.
export function QuickDepositSheet() {
  const open = useQuickDepositOpen();
  const live = useLiveWalletBalance();

  if (live.isReal) {
    return <DepositSheet open={open} onClose={closeQuickDeposit} />;
  }

  return (
    <BottomSheet open={open} onClose={closeQuickDeposit} title="Deposit">
      <WalletSetupButton next="/wallet" centered />
    </BottomSheet>
  );
}
