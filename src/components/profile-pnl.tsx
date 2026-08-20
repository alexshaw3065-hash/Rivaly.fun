"use client";

import { balanceHistory, formatSignedMoney, wallet } from "@/lib/mock-data";
import { WalletActions } from "./wallet-actions";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 64;

// Self-only PNL block — the sparkline is a real polyline built from
// balanceHistory() (a running total over the actual `transactions` array),
// not a decorative curve shaped to look good. WalletActions underneath is
// reused exactly as Wallet's own page uses it, so the actual balance number
// and Deposit/Withdraw only ever appear once, not duplicated here.
export function ProfilePnl() {
  const points = balanceHistory();
  const balances = points.map((p) => p.balanceCents);
  const min = Math.min(...balances);
  const max = Math.max(...balances);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2;
    const y = CHART_HEIGHT - ((p.balanceCents - min) / range) * CHART_HEIGHT;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const delta = balances.length > 1 ? balances[balances.length - 1] - balances[0] : 0;
  const up = delta >= 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Total cash</p>
        {balances.length > 1 && (
          <p
            className="font-mono text-sm font-medium"
            style={{ color: up ? "var(--rival-green)" : "var(--muted)" }}
          >
            {formatSignedMoney(delta)} this period
          </p>
        )}
      </div>

      {coords.length > 1 && (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="mt-3 h-16 w-full"
          preserveAspectRatio="none"
        >
          <polyline
            points={coords.join(" ")}
            fill="none"
            stroke={up ? "var(--rival-green)" : "var(--muted)"}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <WalletActions
          initialBalanceCents={balances[balances.length - 1] ?? wallet.balanceCents}
          centered
        />
      </div>
    </div>
  );
}
