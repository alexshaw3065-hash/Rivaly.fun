"use client";

import Link from "next/link";
import { notifications, formatMoneyCompact } from "@/lib/mock-data";
import { GiftIcon, BellIcon, PlusIcon } from "./icons";
import { useRivalyBalance } from "@/lib/wallet/use-rivaly-balance";
import { useCurrentUser } from "./current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";

export function TopBarIcons({ walletBordered = false }: { walletBordered?: boolean }) {
  const currentUser = useCurrentUser();
  const hasUnread = notifications.some((n) => !n.read);
  // The Rivaly balance — what you can stake right now — not the on-chain
  // wallet behind it (that lives on /wallet, clearly labelled).
  const balance = useRivalyBalance();
  const balanceLabel = balance.hasLoaded && balance.cents !== null ? formatMoneyCompact(balance.cents) : "—";

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
      <button
        onClick={() => openAuthModal()}
        className="rounded-full px-4 py-2 text-xs font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.96]"
        style={{ background: "var(--rival-blue)" }}
      >
        Sign up
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5 md:gap-3.5">
      <Link
        href="/invite"
        aria-label="Invite rivals"
        className="hover-link text-muted transition-colors"
      >
        <GiftIcon />
      </Link>

      <Link
        href="/notifications"
        aria-label="Notifications"
        className="hover-link relative text-muted transition-colors"
      >
        <BellIcon />
        {hasUnread && (
          <span
            className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--rival-blue)" }}
          />
        )}
      </Link>

      {/* Desktop keeps the plain-text treatment (one less boxed element
          next to the sidebar's own chrome). Mobile opts into one bordered
          pill holding both the balance and a nested "+" — a single
          container, not two separate elements side by side, so it reads
          as one compact control rather than two competing for space.
          The balance and the "+" are sibling links inside that pill (real
          <a>s, never one nested inside the other — that's invalid HTML).
          The "+" goes to /wallet, where the balance is topped up. */}
      {walletBordered ? (
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-2.5 pr-1">
          <Link href="/wallet" className="font-mono text-xs font-medium text-foreground">
            {balanceLabel}
          </Link>
          <Link
            href="/wallet"
            aria-label="Add funds"
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-150 ease-out active:scale-[0.88]"
          >
            <span className="[&>svg]:h-2.5 [&>svg]:w-2.5">
              <PlusIcon />
            </span>
          </Link>
        </div>
      ) : (
        <Link href="/wallet" className="font-mono text-xs font-medium text-foreground">
          {balanceLabel}
        </Link>
      )}
    </div>
  );
}
