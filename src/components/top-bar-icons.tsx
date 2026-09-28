"use client";

import Link from "next/link";
import { GiftIcon, BellIcon, PlusIcon } from "./icons";
import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { formatUsdcCompact } from "@/lib/wallet/format";
import { openQuickDeposit } from "@/lib/quick-deposit-store";
import { useCurrentUser } from "./current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useUnreadCount } from "@/lib/notifications";
import { Button } from "./ui/button";

export function TopBarIcons({ walletBordered = false }: { walletBordered?: boolean }) {
  const currentUser = useCurrentUser();
  const unread = useUnreadCount(currentUser?.id ?? null);
  const live = useLiveWalletBalance();
  // No wallet yet (or not read yet) is "—", never a made-up number — the
  // wallet page it links to offers the setup.
  const balanceLabel = live.isReal && live.hasLoaded ? formatUsdcCompact(live.usdcBalance) : "—";

  // Signed out: invite/notifications/balance are all meaningless (there's
  // nothing to invite people to yet, no notifications belong to you, and
  // that balance isn't yours). Desktop already has its own "Sign in" link
  // right next to this component (desktop-header.tsx) — showing another
  // one here would just duplicate it, so this collapses to nothing there.
  // Mobile has no other top-bar sign-in affordance (the only one lives in
  // the bottom tab bar), so this is that entry point.
  if (!currentUser) {
    if (!walletBordered) return null;
    return (
      <Button onClick={() => openAuthModal()} variant="primary" size="sm" className="rounded-full px-4">
        Sign up
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 md:gap-4">
      <Link
        href="/invite"
        aria-label="Invite rivals"
        className="hover-link text-secondary transition-colors"
      >
        <GiftIcon />
      </Link>

      <Link
        href="/notifications"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="hover-link relative text-secondary transition-colors"
      >
        <BellIcon />
        {unread > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-yes px-1 text-micro font-bold tabular-nums leading-none text-white ring-2 ring-background"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>

      {/* Desktop keeps the plain-text treatment (one less boxed element
          next to the sidebar's own chrome). Mobile opts into one bordered
          pill holding both the balance and a nested "+" — a single
          container, not two separate elements side by side, so it reads
          as one compact control rather than two competing for space.
          The balance and the "+" are siblings inside that pill (a real
          <a> and a real <button>, never a button nested inside an anchor —
          that's invalid HTML and the click would double-fire both). The
          sheet itself isn't rendered here — see quick-deposit-sheet.tsx's
          comment on why it's mounted at the Nav root instead. */}
      {walletBordered ? (
        <div className="flex items-center gap-2 rounded-full bg-surface py-1 pl-3 pr-1 edge">
          <Link href="/wallet" className="text-label font-semibold tabular-nums text-foreground">
            {balanceLabel}
          </Link>
          <button
            onClick={openQuickDeposit}
            aria-label="Deposit"
            className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-100 ease-out before:absolute before:-inset-3 active:scale-[0.88]"
          >
            <span className="[&>svg]:h-2.5 [&>svg]:w-2.5">
              <PlusIcon />
            </span>
          </button>
        </div>
      ) : (
        <Link href="/wallet" className="text-label font-semibold tabular-nums text-foreground">
          {balanceLabel}
        </Link>
      )}
    </div>
  );
}
