"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/mock-data";
import { useCurrentUser } from "@/components/current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useRivalyBalance } from "@/lib/wallet/use-rivaly-balance";
import { FAUCET_CEILING_CENTS, TopUpButton } from "./top-up";

/** The number you stake from. Test USDC while Rivaly runs on Solana devnet. */
export function RivalyBalanceCard() {
  const user = useCurrentUser();
  const { cents, hasLoaded } = useRivalyBalance();

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">Rivaly balance</p>
        <p className="mt-1 font-display text-4xl font-bold text-foreground">$0</p>
        <button
          type="button"
          onClick={() => openAuthModal({ next: "/wallet" })}
          className="mt-4 min-h-11 rounded-md bg-rival-blue px-5 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Sign in to get started
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Rivaly balance</p>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-muted">
          TEST USDC · DEVNET
        </span>
      </div>
      <p className="mt-1 font-display text-5xl font-bold tabular-nums text-foreground">
        {hasLoaded && cents !== null ? formatMoney(cents) : "—"}
      </p>
      <p className="mt-1 text-xs text-muted">Stake from this instantly — no wallet popups, no network fees.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {hasLoaded && cents !== null && cents < FAUCET_CEILING_CENTS ? (
          <TopUpButton />
        ) : (
          <p className="text-xs text-muted">Test top-ups unlock when you&rsquo;re under $100.</p>
        )}
        <Link
          href="/rooms/create"
          className="inline-flex min-h-10 items-center rounded-md bg-rival-blue px-4 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Create a room
        </Link>
      </div>
    </div>
  );
}

interface LedgerRow {
  id: string;
  delta_cents: number;
  kind: "faucet" | "deposit" | "withdrawal" | "stake" | "payout" | "refund";
  created_at: string;
  room_id: string | null;
  room: { prediction: string } | null;
}

const KIND_LABEL: Record<LedgerRow["kind"], string> = {
  faucet: "Test USDC",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  stake: "Stake",
  payout: "Won",
  refund: "Refund",
};

/** Every movement on the Rivaly balance, newest first — it always sums to the balance above. */
export function BalanceActivity() {
  const user = useCurrentUser();
  const { cents } = useRivalyBalance();
  const [rows, setRows] = useState<LedgerRow[] | null>(null);

  // Re-read whenever the balance changes, so a top-up or stake made
  // elsewhere on the page shows up here straight away.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    createClient()
      .from("balance_ledger")
      .select("id, delta_cents, kind, created_at, room_id, room:rooms(prediction)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) setRows((data ?? []) as unknown as LedgerRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, cents]);

  if (!user) return null;
  if (rows === null) return <p className="mt-4 text-sm text-muted">Loading…</p>;
  if (rows.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted">
        Nothing yet. Top up and back your first call.
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {rows.map((r) => {
        const positive = r.delta_cents > 0;
        const inner = (
          <>
            <div className="min-w-0">
              <p className="text-sm text-foreground">{KIND_LABEL[r.kind]}</p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {r.room?.prediction ?? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
            </div>
            <p
              className="shrink-0 font-mono text-sm font-semibold"
              style={{ color: positive ? "var(--rival-green)" : "var(--foreground)" }}
            >
              {positive ? "+" : "−"}
              {formatMoney(Math.abs(r.delta_cents))}
            </p>
          </>
        );
        return r.room_id ? (
          <Link key={r.id} href={`/rooms/${r.room_id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-elevated">
            {inner}
          </Link>
        ) : (
          <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
