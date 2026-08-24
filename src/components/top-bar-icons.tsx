"use client";

import { useState } from "react";
import Link from "next/link";
import { notifications, formatMoneyCompact } from "@/lib/mock-data";
import { GiftIcon, BellIcon, PlusIcon } from "./icons";
import { useWalletBalance } from "@/lib/use-wallet-balance";
import { QuickDepositSheet } from "./quick-deposit-sheet";

export function TopBarIcons({ walletBordered = false }: { walletBordered?: boolean }) {
  const hasUnread = notifications.some((n) => !n.read);
  const balance = useWalletBalance();
  const [depositOpen, setDepositOpen] = useState(false);

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
          next to the sidebar's own chrome). Mobile opts into a bordered
          chip — with the avatar/theme toggle gone from this row, the
          balance needed its own visual weight to still read as a real,
          tappable destination rather than a stray label. The "+" is a
          quick-deposit shortcut everywhere — same shared balance as
          /wallet and Profile's PNL card, so it moves in lockstep. */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/wallet"
          className={
            walletBordered
              ? "rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs font-medium text-foreground transition-colors active:scale-[0.97]"
              : "font-mono text-xs font-medium text-foreground"
          }
          style={walletBordered ? { transition: "transform 150ms ease-out, border-color 150ms ease" } : undefined}
        >
          {formatMoneyCompact(balance)}
        </Link>
        <button
          onClick={() => setDepositOpen(true)}
          aria-label="Deposit"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-foreground transition-transform duration-150 ease-out active:scale-[0.9]"
        >
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">
            <PlusIcon />
          </span>
        </button>
      </div>

      <QuickDepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
}
