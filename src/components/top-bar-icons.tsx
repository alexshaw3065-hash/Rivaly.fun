import Link from "next/link";
import { notifications, wallet, formatMoneyCompact } from "@/lib/mock-data";
import { GiftIcon, BellIcon } from "./icons";

export function TopBarIcons() {
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex items-center gap-3 md:gap-3.5">
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

      {/* Plain text, not a bordered chip — one less boxed element competing
          with the gift/bell marks for attention in a tight row. */}
      <Link href="/wallet" className="font-mono text-xs font-medium text-foreground">
        {formatMoneyCompact(wallet.balanceCents)}
      </Link>
    </div>
  );
}
