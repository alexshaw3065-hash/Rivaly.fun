import Link from "next/link";
import { notifications, wallet, formatMoney } from "@/lib/mock-data";

// Hand-drawn, not pulled from an icon pack — see anti-slop-design-law.md on
// generic outline icons. Bare marks, no filled tile behind them.
function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <path d="M10 5.2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6 8.5a4 4 0 0 1 8 0v2.8l1.3 2.2H4.7L6 11.3V8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.5 15.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <rect x="4" y="9" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="6.5" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V16" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5c-1.2 0-2.4-.6-2.4-1.8S8.6 3 9.6 3c1 0 1.4 1 .4 2.2M10 6.5c1.2 0 2.4-.6 2.4-1.8S11.4 3 10.4 3c-1 0-1.4 1-.4 2.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TopBarIcons() {
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex items-center gap-3.5">
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

      <Link
        href="/wallet"
        className="hover-border rounded-md border border-border px-2.5 py-1 font-mono text-xs text-foreground transition-colors"
      >
        {formatMoney(wallet.balanceCents)}
      </Link>
    </div>
  );
}
