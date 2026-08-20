"use client";

import { useState } from "react";
import { balanceHistory, formatMoney, formatSignedMoney, wallet } from "@/lib/mock-data";
import { WalletActions } from "./wallet-actions";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 72;

// Real transaction dates cluster around mid-August, days before whatever
// "today" the system clock reports — anchoring the 24h/7d/30d windows to
// real wall-clock "now" would make every window but the widest read empty,
// which looks broken, not honest. Anchoring to the *latest real
// transaction* instead keeps every window a genuine, non-empty slice of
// real data.
const RANGES = [
  { id: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

function splitMoney(cents: number) {
  const naira = cents / 100;
  const whole = Math.floor(naira);
  const decimals = Math.round((naira - whole) * 100)
    .toString()
    .padStart(2, "0");
  return { whole: `₦${whole.toLocaleString("en-NG")}`, decimals };
}

// Self-only PNL block. The big number is your real current total (cash +
// escrow + pending — every field from the actual `wallet` object, not
// invented), a snapshot rather than something the range toggle filters.
// The chart/delta below it track real cash movement over the selected
// window, built from balanceHistory() (a running total over the actual
// `transactions` array). "Total cash" mirrors WalletActions' own balance
// so the two numbers on this card never disagree.
export function ProfilePnl() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[0]);

  const points = balanceHistory();
  const anchor = points.length > 0 ? +new Date(points[points.length - 1].createdAt) : 0;
  const windowPoints = points.filter((p) => +new Date(p.createdAt) >= anchor - range.ms);
  const shown = windowPoints.length > 0 ? windowPoints : points.slice(-1);

  const balances = shown.map((p) => p.balanceCents);
  const min = Math.min(...balances);
  const max = Math.max(...balances);
  const spread = max - min || 1;

  const coords = shown.map((p, i) => {
    const x = shown.length > 1 ? (i / (shown.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2;
    const y = CHART_HEIGHT - ((p.balanceCents - min) / spread) * CHART_HEIGHT;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const delta = balances.length > 1 ? balances[balances.length - 1] - balances[0] : 0;
  const up = delta >= 0;

  const cashCents = balances[balances.length - 1] ?? wallet.balanceCents;
  const totalCents = wallet.balanceCents + wallet.escrowCents + wallet.pendingCents;
  const { whole, decimals } = splitMoney(totalCents);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline">
          <span className="font-mono text-3xl font-semibold text-foreground md:text-4xl">{whole}</span>
          <span className="font-mono text-3xl font-semibold text-muted md:text-4xl">.{decimals}</span>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-full bg-surface-elevated p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r)}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150"
              style={{
                background: range.id === r.id ? "var(--foreground)" : "transparent",
                color: range.id === r.id ? "var(--background)" : "var(--muted)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {balances.length > 1 && (
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: up ? "var(--rival-green)" : "var(--muted)" }}
        >
          {formatSignedMoney(delta)} {range.label}
        </p>
      )}

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

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm text-muted">
            ₦
          </span>
          <span className="text-sm text-muted">Total cash</span>
        </div>
        <span className="font-mono text-sm font-medium text-foreground">{formatMoney(cashCents)}</span>
      </div>

      <div className="mt-5">
        <WalletActions initialBalanceCents={cashCents} centered />
      </div>
    </div>
  );
}
