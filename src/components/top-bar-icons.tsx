import Link from "next/link";
import { notifications, wallet, formatMoneyCompact } from "@/lib/mock-data";
import { GiftIcon, BellIcon } from "./icons";

export function TopBarIcons({ walletBordered = false }: { walletBordered?: boolean }) {
  const hasUnread = notifications.some((n) => !n.read);

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
          tappable destination rather than a stray label. */}
      <Link
        href="/wallet"
        className={
          walletBordered
            ? "rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs font-medium text-foreground transition-colors active:scale-[0.97]"
            : "font-mono text-xs font-medium text-foreground"
        }
        style={walletBordered ? { transition: "transform 150ms ease-out, border-color 150ms ease" } : undefined}
      >
        {formatMoneyCompact(wallet.balanceCents)}
      </Link>
    </div>
  );
}
