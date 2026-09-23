"use client";

import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/mock-data";
import { claimTestUsdc } from "@/app/rooms/actions";
import { setRivalyBalance, useRivalyBalance } from "@/lib/wallet/use-rivaly-balance";

// Devnet test money, one tap. Rivaly is on Solana devnet, so the fastest
// honest way to let someone try a room is to hand them clearly-labelled test
// USDC right where they need it — the stake step, the join panel, the
// wallet — rather than sending them off to a faucet site and back.
// Mirrors claim_test_usdc() in the rivaly_balance migration.
export const FAUCET_CEILING_CENTS = 100_00;

export function TopUpButton({ className = "", onDone }: { className?: string; onDone?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function claim() {
    setError(null);
    startTransition(async () => {
      const res = await claimTestUsdc();
      if (res.ok) {
        setRivalyBalance(res.balanceCents);
        onDone?.();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-rival-green px-3.5 text-sm font-semibold text-rival-green transition-[transform,opacity,background-color] duration-150 ease-out hover:bg-rival-green-dim active:scale-[0.97] disabled:opacity-50 ${className}`}
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {pending ? "Adding…" : "Get $100 test USDC"}
      </button>
      {error && <span className="text-xs text-danger-red">{error}</span>}
    </span>
  );
}

/**
 * "Balance $X" with a one-tap top-up exactly when the stake doesn't fit.
 * Renders nothing for signed-out visitors — they have no balance yet, and
 * the primary button already says what happens next.
 */
export function BalanceLine({ needCents, signedIn }: { needCents: number; signedIn: boolean }) {
  const { cents, hasLoaded } = useRivalyBalance();
  if (!signedIn) return null;
  const short = hasLoaded && cents !== null && cents < needCents;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <p className="text-sm">
        <span className="text-muted">Balance </span>
        <span className="font-mono font-semibold text-foreground">{hasLoaded && cents !== null ? formatMoney(cents) : "…"}</span>
        {short && <span className="ml-1.5 text-xs text-danger-red">Not enough for this stake</span>}
      </p>
      {/* The faucet only tops up balances under $100 — above that the fix
          is a smaller stake, and the button would just refuse. */}
      {short && cents !== null && cents < FAUCET_CEILING_CENTS && <TopUpButton />}
    </div>
  );
}
