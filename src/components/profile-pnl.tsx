"use client";

import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { formatUsdc } from "@/lib/wallet/format";
import { WalletActions } from "./wallet-actions";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 72;

// A static decorative wave for the zero-activity empty state — explicitly
// not derived from any real series (there isn't one yet), same convention
// FOMO's own reference uses for a brand-new account.
const EMPTY_WAVE = "M0,50 C 30,10 60,10 90,50 C 120,90 150,90 180,50 C 210,10 240,10 270,50 C 290,75 305,75 320,55";

// Self-only balance block: the live on-chain USDC balance ("—" until it's
// read, or while the account has no wallet yet — never a stand-in figure).
// A balance-over-time chart waits for real settled history to draw from.
export function ProfilePnl({ hasPositions = false }: { hasPositions?: boolean }) {
  const live = useLiveWalletBalance();

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <span
        className="block truncate font-mono text-2xl font-semibold md:text-3xl"
        style={{ color: live.isReal && live.hasLoaded ? "var(--foreground)" : "var(--muted)" }}
      >
        {live.isReal && live.hasLoaded ? formatUsdc(live.usdcBalance) : "—"}
      </span>
      <p className="mt-1 text-sm text-muted">USDC available to stake</p>

      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="mt-3 h-16 w-full" preserveAspectRatio="none">
        <path
          d={EMPTY_WAVE}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="4 5"
        />
      </svg>

      <p className="-mt-1 text-center text-sm text-muted">{hasPositions ? "Your balance history draws in as rooms settle" : "No positions yet"}</p>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm text-muted">
            $
          </span>
          <span className="text-sm text-muted">Total cash</span>
        </div>
        <span className="font-mono text-sm font-medium text-foreground">
          {live.isReal && live.hasLoaded ? `${formatUsdc(live.usdcBalance)} USDC` : "—"}
        </span>
      </div>

      <div className="mt-5">
        <WalletActions centered hideBalance />
      </div>
    </div>
  );
}
