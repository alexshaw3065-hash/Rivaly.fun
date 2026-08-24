"use client";

import Link from "next/link";
import { notifications, formatMoneyCompact } from "@/lib/mock-data";
import { GiftIcon, BellIcon, PlusIcon } from "./icons";
import { useWalletBalance } from "@/lib/use-wallet-balance";
import { openQuickDeposit } from "@/lib/quick-deposit-store";

export function TopBarIcons({ walletBordered = false }: { walletBordered?: boolean }) {
  const hasUnread = notifications.some((n) => !n.read);
  const balance = useWalletBalance();

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
          The balance and the "+" are siblings inside that pill (a real
          <a> and a real <button>, never a button nested inside an anchor —
          that's invalid HTML and the click would double-fire both). The
          sheet itself isn't rendered here — see quick-deposit-sheet.tsx's
          comment on why it's mounted at the Nav root instead. */}
      {walletBordered ? (
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-2.5 pr-1">
          <Link href="/wallet" className="font-mono text-xs font-medium text-foreground">
            {formatMoneyCompact(balance)}
          </Link>
          <button
            onClick={openQuickDeposit}
            aria-label="Deposit"
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-150 ease-out active:scale-[0.88]"
          >
            <span className="[&>svg]:h-2.5 [&>svg]:w-2.5">
              <PlusIcon />
            </span>
          </button>
        </div>
      ) : (
        <Link href="/wallet" className="font-mono text-xs font-medium text-foreground">
          {formatMoneyCompact(balance)}
        </Link>
      )}
    </div>
  );
}
