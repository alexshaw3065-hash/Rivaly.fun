"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/mock-data";
import { explorerTxUrl } from "@/lib/wallet/constants";
import type { MyEntry } from "@/lib/supabase/entries";

// The room's resolution, from the viewer's side. Per the emotion design: a
// win is the one loud moment (green, the payout counting up) but premium,
// never confetti; a loss never makes you feel stupid (the real result and a
// one-tap rematch); a refund is calm and neutral. Every money line links to
// its on-chain receipt — trust you can see.

function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    // Reduced motion: land on the final number in one frame, no count.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = duration === 0 ? 1 : Math.min(1, (t - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

const SIDE_COLOR = { yes: "var(--rival-blue)", no: "var(--rival-red)" } as const;

function Receipt({ signature, label }: { signature: string | null; label: string }) {
  if (!signature) return null;
  return (
    <a href={explorerTxUrl(signature)} target="_blank" rel="noopener noreferrer" className="hover-link text-xs text-muted underline underline-offset-2">
      {label} ↗
    </a>
  );
}

export function RoomResult({
  outcome,
  settled,
  refunded,
  matchStillLive,
  entry,
}: {
  outcome: "yes" | "no" | "void";
  /** Payouts confirmed (room settled/refunded) vs. still being sent. */
  settled: boolean;
  /** Every stake returned: void match, or nobody backed the winning side. */
  refunded: boolean;
  matchStillLive: boolean;
  entry: MyEntry | null;
}) {
  const won = entry?.isWinner === true;
  const payout = useCountUp(won ? (entry?.payoutCents ?? 0) : 0);

  if (refunded || outcome === "void") {
    return (
      <div className="enter-pop rounded-lg border border-border-strong bg-surface p-4">
        <p className="text-sm font-semibold text-foreground">Refunded</p>
        <p className="mt-1 text-sm text-muted">
          {entry ? `Your ${formatMoney(entry.amountCents)} ${settled ? "is back in your wallet" : "is on its way back"}.` : "Every stake was returned."}
        </p>
        {entry && <Receipt signature={entry.payoutTxSignature} label="Verify the refund on Solana" />}
      </div>
    );
  }

  const winColor = SIDE_COLOR[outcome];
  return (
    <div className="flex flex-col gap-3">
      {matchStillLive && (
        <div className="enter-row flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white" style={{ background: winColor }}>
          <span aria-hidden>⚡</span> Decided early — {outcome === "yes" ? "YES" : "NO"} wins, paid while the match is still on
        </div>
      )}

      {entry && won ? (
        <div className="enter-pop rounded-xl border p-5" style={{ borderColor: "var(--rival-green)", background: "var(--rival-green-dim)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-rival-green">You called it</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums text-foreground">{formatMoney(payout)}</p>
          <p className="mt-1 text-sm text-muted">
            {settled ? "Paid to your wallet." : "On its way to your wallet…"} You staked {formatMoney(entry.amountCents)} on{" "}
            <span className="font-semibold" style={{ color: SIDE_COLOR[entry.side] }}>
              {entry.side.toUpperCase()}
            </span>
            .
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Receipt signature={entry.payoutTxSignature} label="Verify payout on Solana" />
            <Receipt signature={entry.stakeTxSignature} label="Your stake" />
          </div>
        </div>
      ) : entry ? (
        <div className="enter-pop rounded-lg border border-border-strong bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">
            <span style={{ color: winColor }}>{outcome.toUpperCase()}</span> took this one.
          </p>
          <p className="mt-1 text-sm text-muted">
            You backed {entry.side.toUpperCase()} with {formatMoney(entry.amountCents)}. Next match is yours.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/rooms/create"
              className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              style={{ background: "var(--rival-blue)" }}
            >
              Rematch →
            </Link>
            <Receipt signature={entry.stakeTxSignature} label="Your stake" />
          </div>
        </div>
      ) : (
        <div className="enter-pop rounded-lg border border-border-strong bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">
            <span style={{ color: winColor }}>{outcome.toUpperCase()}</span> wins
          </p>
          <p className="mt-1 text-sm text-muted">{settled ? "Winners have been paid." : "Paying the winners…"}</p>
        </div>
      )}
    </div>
  );
}
