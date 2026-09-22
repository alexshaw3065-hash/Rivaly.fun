"use client";

import { useState } from "react";
import { balanceHistory, formatMoney, formatSignedMoney, wallet } from "@/lib/mock-data";
import { useWalletBalance } from "@/lib/use-wallet-balance";
import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { formatUsdc } from "@/lib/wallet/format";
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

// Standard Catmull-Rom → cubic-bezier conversion — a genuinely smooth
// curve through the real data points (FOMO's reference chart), not a
// straight-segment polyline and not a fake border-radius trick.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

// A static decorative wave for the zero-activity empty state — explicitly
// not derived from any real series (there isn't one yet), same convention
// FOMO's own reference uses for a brand-new account.
const EMPTY_WAVE = "M0,50 C 30,10 60,10 90,50 C 120,90 150,90 180,50 C 210,10 240,10 270,50 C 290,75 305,75 320,55";

// Self-only PNL block. The big number is your real current total (cash +
// escrow + pending — every field from the actual `wallet` object, not
// invented), a snapshot rather than something the range toggle filters.
// The chart/delta below it track real cash movement over the selected
// window, built from balanceHistory() (a running total over the actual
// `transactions` array). "Total cash" mirrors WalletActions' own balance
// so the two numbers on this card never disagree.
export function ProfilePnl() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[0]);
  const liveBalanceCents = useWalletBalance();
  const live = useLiveWalletBalance();

  const points = balanceHistory();
  // Real users: no wallet_transactions-derived chart yet for V1 (see the
  // deposits/withdrawals plan) — reuse the existing zero-activity empty
  // state rather than building a second one just for the real path.
  const hasActivity = !live.isReal && points.length >= 2;

  const anchor = points.length > 0 ? +new Date(points[points.length - 1].createdAt) : 0;
  const windowPoints = points.filter((p) => +new Date(p.createdAt) >= anchor - range.ms);
  const shown = windowPoints.length > 0 ? windowPoints : points.slice(-1);

  const balances = shown.map((p) => p.balanceCents);
  const min = Math.min(...balances);
  const max = Math.max(...balances);
  const spread = max - min || 1;

  const coords = shown.map((p, i) => ({
    x: shown.length > 1 ? (i / (shown.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2,
    y: CHART_HEIGHT - ((p.balanceCents - min) / spread) * CHART_HEIGHT,
  }));
  const path = smoothPath(coords);

  const delta = balances.length > 1 ? balances[balances.length - 1] - balances[0] : 0;
  const up = delta >= 0;

  // The "right now" numbers (this row + the big total above) read the live
  // shared balance — same one the top bar's quick-deposit and /wallet use
  // — not the chart's last historical point, so a deposit shows up here
  // immediately instead of only after a new transaction lands. The chart
  // itself stays a real historical view of balanceHistory(); it isn't
  // expected to redraw for a balance change with no transaction behind it.
  const totalCents = hasActivity ? liveBalanceCents + wallet.escrowCents + wallet.pendingCents : 0;
  const { whole, decimals } = splitMoney(totalCents);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-baseline">
          {live.isReal ? (
            <span
              className="truncate font-mono text-2xl font-semibold md:text-3xl"
              style={{ color: live.hasLoaded ? "var(--foreground)" : "var(--muted)" }}
            >
              {live.hasLoaded ? formatUsdc(live.usdcBalance) : "—"}
            </span>
          ) : (
            <>
              <span
                className="truncate font-mono text-2xl font-semibold md:text-3xl"
                style={{ color: hasActivity ? "var(--foreground)" : "var(--muted)" }}
              >
                {whole}
              </span>
              <span className="shrink-0 font-mono text-2xl font-semibold text-muted md:text-3xl">
                .{decimals}
              </span>
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-full bg-surface-elevated p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r)}
              disabled={!hasActivity}
              className="rounded-full px-2 py-1 text-[11px] font-medium transition-colors duration-150"
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

      {hasActivity ? (
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: up ? "var(--rival-green)" : "var(--muted)" }}
        >
          {formatSignedMoney(delta)} {range.label}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">--</p>
      )}

      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="mt-3 h-16 w-full" preserveAspectRatio="none">
        {hasActivity ? (
          <path d={path} fill="none" stroke={up ? "var(--rival-green)" : "var(--muted)"} strokeWidth={2} strokeLinecap="round" />
        ) : (
          <path
            d={EMPTY_WAVE}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="4 5"
          />
        )}
      </svg>

      {!hasActivity && <p className="-mt-1 text-center text-sm text-muted">No positions yet</p>}

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm text-muted">
            {live.isReal ? "$" : "₦"}
          </span>
          <span className="text-sm text-muted">Total cash</span>
        </div>
        <span className="font-mono text-sm font-medium text-foreground">
          {live.isReal
            ? live.hasLoaded
              ? `${formatUsdc(live.usdcBalance)} USDC`
              : "—"
            : formatMoney(liveBalanceCents)}
        </span>
      </div>

      <div className="mt-5">
        <WalletActions centered hideBalance />
      </div>
    </div>
  );
}
